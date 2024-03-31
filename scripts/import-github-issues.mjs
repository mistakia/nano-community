import dayjs from 'dayjs'
import queryString from 'query-string'
import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { request, isMain } from '#common'
import { github_access_token } from '#config'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const log = debug('import-github-issues')
debug.enable('import-github-issues')

const setIssueLabel = async ({ repo, issue_number, labels }) => {
  log(`set issue #${issue_number} labels: ${labels}`)
  const url = `https://api.github.com/repos/${repo}/issues/${issue_number}`
  return request({
    url,
    method: 'PATCH',
    body: JSON.stringify({ labels }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${github_access_token}`
    }
  })
}

const importGithubIssues = async ({ repo }) => {
  // get most recent updated_at for repo
  const { updated_at: last_updated_at } = await db('github_issues')
    .select('updated_at')
    .where('repo', repo)
    .orderBy('updated_at', 'desc')
    .limit(1)
    .first()

  const per_page = 100
  let page = 1
  let res
  const issues = []
  const issueLabels = []

  const since = last_updated_at
    ? dayjs.unix(last_updated_at).toISOString()
    : null

  log(`Getting issues from ${repo} since ${since}`)

  do {
    const params = {
      since,
      per_page,
      page,
      state: 'all'
    }
    const url = `https://api.github.com/repos/${repo}/issues?${queryString.stringify(
      params
    )}`

    log(url)

    try {
      res = await request({ url })
    } catch (err) {
      log(err)
    }

    if (!res) {
      return
    }

    log(`Got ${res.length} issues from ${repo}`)

    for (const item of res) {
      const issue = {}

      // populate issue with various properties
      issue.repo = repo
      issue.state = item.state
      issue.id = item.id
      issue.actor_id = item.user.id
      issue.actor_name = item.user.login
      issue.actor_avatar = item.user.avatar_url
      issue.ref = item.number
      issue.title = item.title
      issue.body = item.body
      issue.url = item.html_url
      issue.created_at = dayjs(item.created_at).unix()
      issue.updated_at = dayjs(item.updated_at).unix()
      issues.push(issue)
      item.labels.forEach((label) =>
        issueLabels.push({
          issue_id: issue.id,
          label_id: label.id,
          label_name: label.name,
          label_color: label.color
        })
      )

      issue.assignee_id = item.assignee?.id
      issue.assignee_name = item.assignee?.login
      issue.assignee_avatar = item.assignee?.avatar_url

      // check if issue needs triage
      const labels = issueLabels.map((i) => i.label_name)
      const hasPriority = Boolean(
        labels.find((name) => name.includes('priority/'))
      )
      const hasKind = Boolean(labels.find((name) => name.includes('kind/')))
      const needsTriage = !hasPriority || !hasKind
      const hasTriage = Boolean(
        labels.find((name) => name.includes('need/triage'))
      )
      if (needsTriage && !hasTriage) {
        labels.push('need/triage')
        await setIssueLabel({ repo, issue_number: item.number, labels })
      }
    }

    page++
  } while (res.length === per_page)

  if (issues.length) {
    log(`saving ${issues.length} issues from github`)
    await db('github_issues').insert(issues).onConflict().merge()
  }

  if (issueLabels.length) {
    // delete any potentially stale labels
    const issueIds = issueLabels.map((i) => i.issue_id)
    await db('github_issue_labels').del().whereIn('issue_id', issueIds)

    log(`saving ${issues.length} issue labels from github`)
    await db('github_issue_labels').insert(issueLabels).onConflict().merge()
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      if (!argv.repo) {
        console.log('missing --repo')
        process.exit()
      }

      await importGithubIssues({ repo: argv.repo })
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }
  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default importGithubIssues
