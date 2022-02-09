const express = require('express')
const router = express.Router()

router.get('/nano-node', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    let exclude = req.query.exclude || []
    if (!Array.isArray(exclude)) {
      exclude = [exclude]
    }

    const cacheKey = `/api/github/events/nano-node/${exclude.join(',')}`
    const cachedEvents = cache.get(cacheKey)
    if (cachedEvents) {
      return res.status(200).send(cachedEvents)
    }

    let query = db('github_events').orderBy('created_at', 'desc').limit(20)

    if (exclude.length) {
      query = query.whereNotIn('type', exclude)
    }

    const events = await query

    cache.set(cacheKey, events, 60)
    res.status(200).send(events)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
