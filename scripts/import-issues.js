const dayjs = require('dayjs')
const queryString = require('query-string')
const debug = require('debug')
const { request } = require('../common')
const db = require('../db')
const logger = debug('script')
debug.enable('script')

// const formatEvent = (item) => {
//   return {
//     actor: item.payload.user,
//     action: item.payload.action, // opened, closed, reopened, assigned, unassigned, labeled, unlabled
//     event_url: item.payload.html_url,
//     title: item.payload.title,
//     labels: item.payload.labels,
//     body: item.payload.body
//   }
// }
// const format = (item) => {
//   const { id, type } = item
//   const event = formatEvent(item)
//   return {
//     ...event,
//     id,
//     type,
//     actor_id: item.author.id,
//     actor_name: item.author.login,
//     actor_avatar: item.author.avatar_url,
//     created_at: dayjs(item.created_at).unix()
//   }
// }

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
    issue.actor_id = item.user.id
    issue.actor_name = item.user.login
    issue.actor_avatar_url = item.user.actor_avatar_url
    issue.id = item.id
    issue.url = item.html_url
    issue.title = item.title
    issue.body = item.body
    issue.date = dayjs(item.created_at).unix()
    issues.push(issue)
    item.labels.forEach((label) => issueLabels.push({ id: item.id, name: label.name, color: item.color }))
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
