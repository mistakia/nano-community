const express = require('express')

const router = express.Router({ mergeParams: true })

router.get('/?', async (req, res) => {
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

    const limit = Math.min(parseInt(req.query.limit || 100, 0), 100)
    const offset = parseInt(req.query.offset, 0) || 0

    const cacheKey = `/account/${address}/delegators/${offset},${limit}`
    const cachedDelegators = cache.get(cacheKey)
    if (cachedDelegators) {
      return res.status(200).send(cachedDelegators)
    }

    const delegators = await db('accounts_delegators')
      .select('accounts_delegators.account', 'accounts_delegators.balance', 'accounts.alias')
      .leftJoin('accounts', 'accounts.account', 'accounts_delegators.account')
      .where('accounts_delegators.representative', address)
      .orderBy('accounts_delegators.balance', 'desc')
      .limit(limit)
      .offset(offset)

    cache.set(cacheKey, delegators, 300)
    res.send(delegators)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
