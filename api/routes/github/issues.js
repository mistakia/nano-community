const express = require('express')
const router = express.Router()

router.get('/nano-community', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cacheKey = '/api/github/issues/nano-community'
    const cachedIssues = cache.get(cacheKey)
    if (cachedIssues) {
      return res.status(200).send(cachedIssues)
    }

    const issues = await db('github_issues')
      .orderBy('created_at', 'desc')
      .limit(20)
    const ids = issues.map((i) => i.id)
    const labels = await db('github_issue_labels').whereIn('issue_id', ids)
    const data = issues.map((i) => ({
      labels: labels.filter((l) => l.issue_id === i.id),
      ...i
    }))

    cache.set(cacheKey, data, 60)
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
