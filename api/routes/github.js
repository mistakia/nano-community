const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cachedEvents = cache.get('github')
    if (cachedEvents) {
      return res.status(200).send(cachedEvents)
    }

    const events = await db('github_events')
      .orderBy('created_at', 'desc')
      .limit(20)

    cache.set('github', events, 60)
    res.status(200).send(events)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
