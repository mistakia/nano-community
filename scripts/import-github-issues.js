const dayjs = require('dayjs')
const queryString = require('query-string')
const debug = require('debug')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const { request } = require('../common')
const config = require('../config')
const db = require('../db')

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
      Authorization: `token ${config.github_access_token}`
    }
  })
}

const main = async ({ repo }) => {
  const params = {
    state: 'open'
  }
  const url = `https://api.github.com/repos/${repo}/issues?${queryString.stringify(
    params
  )}`

  let res
  try {
    res = await request({ url })
  } catch (err) {
    log(err)
  }

  if (!res) {
    return
  }

  const issues = []
  const issueLabels = []
  for (const item of res) {
    const issue = {}

    // populate issue with various properties
    issue.repo = repo
    issue.id = item.id
    issue.actor_id = item.user.id
    issue.actor_name = item.user.login
    issue.actor_avatar = item.user.avatar_url
    issue.ref = item.number
    issue.title = item.title
    issue.body = item.body
    issue.url = item.html_url
    issue.created_at = dayjs(item.created_at).unix()
    issues.push(issue)
    item.labels.forEach((label) =>
      issueLabels.push({
        issue_id: issue.id,
        label_id: label.id,
        label_name: label.name,
        label_color: label.color
      })
    )

    // check if issue needs triage
    const labels = issueLabels.map((i) => i.label_name)
    const hasPriority = Boolean(
      labels.find((name) => name.includes('priority/'))
    )
    const hasKind = Boolean(labels.find((name) => name.includes('kind/')))
    const hasNeed = Boolean(labels.find((name) => name.includes('need/')))
    const needsTriage = !hasPriority || !hasKind || !hasNeed
    const hasTriage = Boolean(
      labels.find((name) => name.includes('need/triage'))
    )
    if (needsTriage && !hasTriage) {
      labels.push('need/triage')
      await setIssueLabel({ repo, issue_number: item.number, labels })
    }
  }

  if (issues.length) {
    log(`saving ${issues.length} issues from github`)
    await db('github_issues').insert(issues).onConflict().merge()
  }

  if (issueLabels.length) {
    log(`saving ${issues.length} issue labels from github`)
    await db('github_issue_labels').insert(issueLabels).onConflict().merge()
  }
}

module.exports = main
if (!module.parent) {
  const init = async () => {
    try {
      if (!argv.repo) {
        console.log('missing --repo')
        process.exit()
      }

      await main({ repo: argv.repo })
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }
  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
