import express from 'express'

import { is_nano_address_valid } from '#common'

const router = express.Router()

const MAX_NAME_RESULTS = 100
const MAX_BATCH_ADDRESSES = 500

const attach_tags = async ({ db, rows }) => {
  const tags = await db('accounts_tags')
    .select('account', 'tag')
    .whereIn(
      'account',
      rows.map((row) => row.account)
    )
    .orderBy('tag')
  const by_account = {}
  for (const { account, tag } of tags) {
    if (!by_account[account]) by_account[account] = []
    by_account[account].push(tag)
  }
  return rows.map((row) => ({ ...row, tags: by_account[row.account] || [] }))
}

// Accounts whose resolved alias or any live alias claim starts with the
// name, case-insensitive: exact matches first, then representatives
router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : ''
    if (!name || name.length > 255) {
      return res.status(400).send({ error: 'name is required' })
    }

    const cache_key = `/account-labels/name/${name.toLowerCase()}`
    const cached = cache.get(cache_key)
    if (cached) {
      return res.status(200).send(cached)
    }

    const lower_name = name.toLowerCase()
    const prefix = lower_name.replace(/[\\%_]/g, '\\$&') + '%'
    const now = Math.floor(Date.now() / 1000)
    const { rows } = await db.raw(
      `select accounts.account, accounts.alias, accounts.representative,
          array_agg(distinct names.name order by names.name) as names
        from (
          select account, alias as name from accounts
            where lower(alias) like :prefix
          union
          select account, value as name from account_labels
            where label_type = 'alias' and lower(value) like :prefix
              and (expires_at is null or expires_at > :now)
        ) names
        join accounts on accounts.account = names.account
        group by accounts.account, accounts.alias, accounts.representative
        order by bool_or(lower(names.name) = :lower_name) desc,
          accounts.representative desc, accounts.alias
        limit :limit`,
      { prefix, now, lower_name, limit: MAX_NAME_RESULTS }
    )

    const accounts = await attach_tags({ db, rows })
    cache.set(cache_key, accounts, 300)
    res.status(200).send(accounts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

// Resolved alias and tags for each address: { [address]: { alias, tags } }
router.post('/resolve', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const { addresses } = req.body || {}
    if (
      !Array.isArray(addresses) ||
      !addresses.length ||
      addresses.length > MAX_BATCH_ADDRESSES
    ) {
      return res.status(400).send({
        error: `addresses must be an array of 1 to ${MAX_BATCH_ADDRESSES} accounts`
      })
    }
    const invalid = addresses.find((address) => !is_nano_address_valid(address))
    if (invalid !== undefined) {
      return res.status(400).send({ error: `invalid address: ${invalid}` })
    }

    const accounts = [
      ...new Set(addresses.map((address) => address.replace(/^xrb_/, 'nano_')))
    ]
    const rows = await db('accounts')
      .select('account', 'alias')
      .whereIn('account', accounts)
    const labelled = await attach_tags({ db, rows })
    const by_account = Object.fromEntries(
      labelled.map(({ account, alias, tags }) => [account, { alias, tags }])
    )

    const result = {}
    for (const address of addresses) {
      result[address] = by_account[address.replace(/^xrb_/, 'nano_')] || {
        alias: null,
        tags: []
      }
    }
    res.status(200).send(result)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
