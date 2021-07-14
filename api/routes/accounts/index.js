const express = require('express')
const BigNumber = require('bignumber.js')
const router = express.Router()

const { rpc } = require('../../../common')
const delegators = require('./delegators')
const blocks = require('./blocks')
const open = require('./open')

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

    const accountInfo = await rpc.accountInfo({
      account: address,
      pending: true,
      representative: true
    })
    const data = {
      account: address,
      account_meta: {
        account: address,
        balance: BigNumber(accountInfo.balance).toNumber(),
        block_count: BigNumber(accountInfo.block_count).toNumber(),
        weight: BigNumber(accountInfo.weight).toNumber(),
        confirmation_height: BigNumber(
          accountInfo.confirmation_height
        ).toNumber()
      }
    }

    const representatives = await db('accounts').where({
      account: address,
      representative: true
    })

    if (!representatives.length) {
      const account = {
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

    const uptime = await db('representatives_uptime_rollup_2hour')
      .where({ account: address })
      .orderBy('interval', 'asc')

    const repMeta = await db('representatives_meta')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1)

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
      .orderBy('accounts_delegators.balance', 'desc')
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

module.exports = router
