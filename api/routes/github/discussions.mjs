import express from 'express'
const router = express.Router()

router.get('/nano-community', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cacheKey = '/api/github/discussions/nano-community'
    const cachedDiscussions = cache.get(cacheKey)
    if (cachedDiscussions) {
      return res.status(200).send(cachedDiscussions)
    }

    const discussions = await db('github_discussions')
      .where('category_id', 'MDE4OkRpc2N1c3Npb25DYXRlZ29yeTMyOTA1MTIz') // proposals category
      .orderBy('created_at', 'desc')
      .limit(20)
    const ids = discussions.map((i) => i.id)
    const labels = await db('github_discussion_labels').whereIn(
      'discussion_id',
      ids
    )
    const data = discussions.map((i) => ({
      labels: labels.filter((l) => l.discussion_id === i.id),
      ...i
    }))

    cache.set(cacheKey, data, 60)
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
