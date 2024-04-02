import express from 'express'

const router = express.Router()

router.get('/nano-community', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  const { repos, state, labels: query_labels, offset = 0 } = req.query

  const allowed_repos = ['mistakia/nano-community']
  if (repos && !allowed_repos.includes(repos)) {
    return res.status(400).send({
      error:
        'Invalid repository. Allowed repository is mistakia/nano-community.'
    })
  }

  const allowed_states = ['open', 'closed']
  if (state && !allowed_states.includes(state)) {
    return res
      .status(400)
      .send({ error: 'Invalid state. Allowed states are open and closed.' })
  }

  try {
    const cache_key = `/api/github/issues/nano-community?repos=${repos}&state=${state}&labels=${query_labels}&offset=${offset}`
    const cached_issues = cache.get(cache_key)
    if (cached_issues) {
      return res.status(200).send(cached_issues)
    }

    let query = db('github_issues')
      .orderBy('updated_at', 'desc')
      .limit(100)
      .offset(offset)

    if (repos) {
      const repo_list = repos.split(',')
      query = query.whereIn('repo', repo_list)
    }

    if (state) {
      query = query.where({ state })
    }

    if (query_labels) {
      const label_list = query_labels.split(',')
      query = query
        .join(
          'github_issue_labels',
          'github_issues.id',
          '=',
          'github_issue_labels.issue_id'
        )
        .whereIn('github_issue_labels.label_name', label_list)
    }

    const issues = await query.select('github_issues.*')
    const ids = issues.map((issue) => issue.id)
    const labels = await db('github_issue_labels').whereIn('issue_id', ids)
    const data = issues.map((issue) => ({
      ...issue,
      labels: labels.filter((label) => label.issue_id === issue.id)
    }))

    cache.set(cache_key, data, 60 * 10) // Cache for 10 minutes
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
