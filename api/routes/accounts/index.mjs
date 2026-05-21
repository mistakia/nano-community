import express from 'express'
import BigNumber from 'bignumber.js'

import { rpc, is_terminal_rpc_error } from '#common'
import delegators from './delegators.mjs'
import blocks from './blocks.mjs'
import open from './open.mjs'

const router = express.Router()

router.get('/:address', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { address } = req.params

    if (!address) {
      return res.status(401).send({ error: 'missing address' })
    }

    const re = /^(nano|xrb)_[13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59}$/gi
    if (!re.test(address)) {
      return res.status(401).send({ error: 'invalid address' })
    }

    const cacheKey = `/account/${address}`
    const cachedAccount = cache.get(cacheKey)
    if (cachedAccount) {
      return res.status(200).send(cachedAccount)
    }

    const [account_weight, accountInfo] = await Promise.all([
      rpc.accountWeight({ account: address }),
      rpc.accountInfo({
        account: address,
        pending: true,
        representative: true,
        weight: true
      })
    ])

    // Unopened account: every node returned "Account not found" / similar.
    // Build a zero-valued payload, cache it, and skip the representative
    // database lookups (the address can't be a representative if it has
    // never published a block).
    if (is_terminal_rpc_error(accountInfo)) {
      const unopened = {
        account: address,
        alias: null,
        representative: false,
        representative_meta: {},
        uptime: [],
        uptime_summary: {},
        telemetry: {},
        telemetry_history: [],
        network: {},
        account_meta: {
          account: address,
          modified_timestamp: 0,
          account_version: 0,
          representative: null,
          pending: 0,
          balance: 0,
          block_count: 0,
          weight: 0,
          confirmation_height: 0
        },
        unopened: true
      }
      cache.set(cacheKey, unopened, 30)
      return res.status(200).send(unopened)
    }

    // Some addresses fall through the retry loop with a `null` (all nodes
    // unreachable / timed out). Treat that as a transport failure rather
    // than crashing on `BigNumber(undefined)`.
    if (!accountInfo) {
      return res.status(502).send({ error: 'nano_rpc_unreachable' })
    }

    const data = {
      account: address,
      account_meta: {
        account: address,
        modified_timestamp: BigNumber(
          accountInfo.modified_timestamp
        ).toNumber(),
        account_version: BigNumber(accountInfo.account_version).toNumber(),
        representative: accountInfo.representative,
        pending: BigNumber(accountInfo.pending).toNumber(),
        balance: BigNumber(accountInfo.balance).toNumber(),
        block_count: BigNumber(accountInfo.block_count).toNumber(),
        weight: BigNumber(
          (account_weight && account_weight.weight) || 0
        ).toNumber(),
        confirmation_height: BigNumber(
          accountInfo.confirmation_height
        ).toNumber()
      }
    }

    const representatives = await db('accounts').where({ account: address })

    // if not a representative
    if (!representatives.length || !representatives[0].representative) {
      const account = {
        alias: representatives.length ? representatives[0].alias : null,
        representative: false,
        representative_meta: {},
        uptime: [],
        uptime_summary: {},
        telemetry: {},
        telemetry_history: [],
        network: {},
        ...data
      }
      cache.set(cacheKey, account, 30)
      return res.status(200).send(account)
    }

    const lastOnline = await db('representatives_uptime')
      .where({
        account: address,
        online: 1
      })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const lastOffline = await db('representatives_uptime')
      .where({
        account: address,
        online: 0
      })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const uptime = await db('representatives_uptime_rollup_hour')
      .where({ account: address })
      .orderBy('interval', 'asc')

    const repMeta = await db('representatives_meta_index').where({
      account: address
    })

    const network = await db('representatives_network')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const telemetry = await db('representatives_telemetry')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1000)

    const uptimeSummary = await db('representatives_uptime_summary').where({
      account: address
    })

    const delegators = await db('accounts_delegators')
      .select(
        'accounts_delegators.account',
        'accounts_delegators.balance',
        'accounts.alias'
      )
      .leftJoin('accounts', 'accounts.account', 'accounts_delegators.account')
      .where('accounts_delegators.representative', address)
      .orderByRaw('accounts_delegators.balance desc nulls last')
      .limit(100)

    const rep = {
      ...representatives[0],
      ...data
    }
    rep.representative_meta = repMeta[0] || {}
    rep.uptime = uptime
    rep.telemetry = telemetry[0] || {}
    rep.telemetry_history = telemetry
    rep.network = network[0] || {}
    rep.last_online = lastOnline[0] ? lastOnline[0].timestamp : 0
    rep.last_offline = lastOffline[0] ? lastOffline[0].timestamp : 0
    rep.uptime_summary = uptimeSummary.reduce((res, { days, ...item }) => {
      res[`days_${days}`] = item
      return res
    }, {})
    rep.delegators = delegators

    cache.set(cacheKey, rep, 30)
    res.send(rep)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.use('/:address/blocks', blocks)
router.use('/:address/delegators', delegators)
router.use('/:address/open', open)

export default router
