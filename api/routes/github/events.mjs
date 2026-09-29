import express from 'express'

const router = express.Router()

// automated reviewers and CI bots that drown out contributor activity
const bot_actors = ['copilot-pull-request-reviewer', 'gr0vity-dev-bot']

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

    let query = db('github_events')
      .whereNotIn('actor_name', bot_actors)
      .whereNot('actor_name', 'like', '%[bot]')
      .orderBy('created_at', 'desc')
      .limit(20)

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

export default router
