import dayjs from 'dayjs'
import debug from 'debug'

import { request, isMain, wait } from '#common'
import report_job from '#libs-server/report-job.mjs'
import db from '#db'

const logger = debug('import-github-events')

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
    created_at: dayjs(item.created_at).unix()
  }
}

// GitHub intermittently answers the events endpoint with a transient HTML edge
// page (non-2xx, non-JSON) while the rest of the API stays healthy. Absorb a
// sub-minute hiccup with a bounded backoff so an interstitial stops being a
// hard pipeline_failure with an opaque error; a sustained outage still throws
// once the retries are exhausted.
const EVENTS_RETRY_BACKOFF_MS = [3000, 10000, 30000]

const isTransient = (err) => {
  const status = err.status || (err.response && err.response.status)
  return (
    err.nonJson === true ||
    !status ||
    status === 429 ||
    status >= 500 ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|EPIPE|socket hang up/i.test(
      err.message || ''
    )
  )
}

const fetchEvents = async () => {
  const url = 'https://api.github.com/repos/nanocurrency/nano-node/events'
  let lastError
  for (let attempt = 0; attempt <= EVENTS_RETRY_BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = EVENTS_RETRY_BACKOFF_MS[attempt - 1]
      logger(
        `github events request failed (${lastError.message}); retry ${attempt}/${EVENTS_RETRY_BACKOFF_MS.length} in ${delay}ms`
      )
      await wait(delay)
    }
    try {
      return await request({ url })
    } catch (err) {
      lastError = err
      if (!isTransient(err)) {
        throw err
      }
    }
  }
  throw lastError
}

const importGithubEvents = async () => {
  // Do not swallow: a failed fetch is fatal — let it propagate so main() reports
  // the run as a failure instead of returning early as a success.
  const res = await fetchEvents()

  if (!res) {
    return
  }

  const items = res.map((i) => format(i))
  if (items.length) {
    logger(`saving ${items.length} events from github`)
    await db('github_events').insert(items).onConflict('id').merge()
  }
}

if (isMain(import.meta.url)) {
  debug.enable('import-github-events')
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await importGithubEvents()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-import-github-events',
      success: !error,
      reason: error ? error.message : null,
      duration_ms: Date.now() - start_time
    })

    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default importGithubEvents
