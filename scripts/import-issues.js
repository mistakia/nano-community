const dayjs = require('dayjs')
const queryString = require('query-string')
const debug = require('debug')
const { request } = require('../common')
const db = require('../db')
const logger = debug('script')
debug.enable('script')
const main = async () => {
  const params = {
    state: 'open'
  }
  const url = `https://api.github.com/repos/mistakia/nano-community/issues${queryString.stringify(
      params
    )}`

  let res
  try {
    res = await request({ url })
  } catch (err) {
    console.log(err)
  }
  if (!res) {
    return
  }
  const issues = []
  const issueLabels = []
  for (const item of res) {
    const issue = {}

    // populate issue with various properties
    issue.id = item.id
    issue.actor_id = item.user.id
    issue.actor_name = item.user.login
    issue.actor_avatar_url = item.user.actor_avatar_url
    issue.ref = item.number
    issue.title = item.title
    issue.body = item.body
    issue.url = item.html_url
    issue.date = dayjs(item.created_at).unix()
    issues.push(issue)
    item.labels.forEach((label) => issueLabels.push({ issue_id: issue.id, label_id: item.id, label_name: label.name, label_color: item.color }))
  }
  if (issues.length) {
    logger(`saving ${issues.length} issues from github`)
    await db('github_issues').insert(issues).onConflict().merge()
  }

  if (issueLabels.length) {
    logger(`saving ${issues.length} issue labels from github`)
    await db('github_issue_labels').insert(issueLabels).onConflict().merge()
  }
}

module.exports = main
if (!module.parent) {
  const init = async () => {
    try {
      await main()
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
