const moment = require('moment')
const debug = require('debug')

const { request } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const formatEvent = (item) => {
  switch (item.type) {
    case 'CommitCommentEvent':
      return {
        action: item.payload.action, // created
        ref: item.payload.comment.commit_id,
        event_url: item.payload.comment.html_url,
        body: item.payload.comment.body
      }

    case 'CreateEvent':
    case 'DeleteEvent':
      return {
        action: item.payload.ref_type, // tag or branch
        ref: item.payload.ref, // name
        body: item.payload.description // tag or branch description
      }

    case 'ForkEvent':
      return {
        ref: item.payload.forkee.full_name, // fork path
        event_url: item.payload.forkee.html_url
      }

    case 'IssueCommentEvent':
      return {
        action: item.payload.action, // created, edited, deleted
        ref: item.payload.issue.number,
        event_url: item.payload.comment.html_url,
        title: item.payload.issue.title,
        body: item.payload.comment.body
      }

    case 'IssuesEvent':
      return {
        action: item.payload.action, // opened, closed, reopened, assigned, unassigned, labeled, unlabled
        ref: item.payload.issue.number,
        event_url: item.payload.issue.html_url,
        title: item.payload.issue.title
        // body: item.payload.label || item.payload // TODO
      }

    case 'PublicEvent':
    case 'MemberEvent':
    case 'SponsorshipEvent':
      return {}

    case 'PullRequestEvent':
      return {
        action: item.payload.action, // opened, closed, reopened, assigned, unassigned, review_requested, review_request_removed, labeled, unlabeled, and synchronize
        ref: item.payload.pull_request.number,
        title: item.payload.pull_request.title,
        event_url: item.payload.pull_request.html_url,
        body: item.payload.pull_request.body
      }

    case 'PullRequestReviewEvent':
      return {
        action: item.payload.action, // created
        ref: item.payload.pull_request.number,
        title: item.payload.review.state,
        body: item.payload.review.body,
        event_url: item.payload.review.html_url
      }

    case 'PullRequestReviewCommentEvent':
      return {
        action: item.payload.action,
        ref: item.payload.pull_request.number,
        event_url: item.payload.comment.html_url,
        title: item.payload.pull_request.title,
        body: item.payload.comment.body
      }

    case 'PushEvent':
      return {
        ref: item.payload.ref,
        title: item.payload.head
      }

    case 'ReleaseEvent':
      return {
        action: item.payload.action,
        ref: item.payload.release.tag_name,
        title: item.payload.release.name,
        body: item.payload.release.body,
        event_url: item.payload.release.html_url
      }

    case 'WatchEvent':
      return {
        action: item.payload.action
      }

    default:
      return {}
  }
}

const format = (item) => {
  const { id, type } = item
  const event = formatEvent(item)
  return {
    ...event,
    id,
    type,
    actor_id: item.actor.id,
    actor_name: item.actor.display_login,
    actor_avatar: item.actor.avatar_url,
    created_at: moment(item.created_at).unix()
  }
}

const main = async () => {
  const url = 'https://api.github.com/repos/nanocurrency/nano-node/events'

  let res
  try {
    res = await request({ url })
  } catch (err) {
    console.log(err)
  }

  if (!res) {
    return
  }

  const items = res.map((i) => format(i))
  if (items.length) {
    logger(`saving ${items.length} events from github`)
    await db('github_events').insert(items).onConflict().merge()
  }
}

module.exports = main

if (!module.parent) {
  const init = async () => {
    await main()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
