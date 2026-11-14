import express from 'express'

const router = express.Router({ mergeParams: true })

// Daily weight and delegator count (accounts holding at least 1 Nano) for a
// representative, oldest first, from the accounts_meta_rollup_day aggregate.
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

    const cache_key = `/account/${address}/delegation_history`
    const cached_delegation_history = cache.get(cache_key)
    if (cached_delegation_history) {
      return res.status(200).send(cached_delegation_history)
    }

    const delegation_history = await db('accounts_meta_rollup_day')
      .select('timestamp', 'weight', 'delegators')
      .where({ account: address })
      .orderBy('timestamp', 'asc')

    cache.set(cache_key, delegation_history, 600)
    res.send(delegation_history)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
