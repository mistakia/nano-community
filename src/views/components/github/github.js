import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'

import './github.styl'

const locale = function (number, index, totalSec) {
  return [
    ['just now', 'right now'],
    ['%ss', 'in %ss'],
    ['1m', 'in 1m'],
    ['%sm', 'in %sm'],
    ['1h', 'in 1h'],
    ['%sh', 'in %sh'],
    ['1d', 'in 1d'],
    ['%sd', 'in %sd'],
    ['1w', 'in 1w'],
    ['%sw', 'in %sw'],
    ['1M', 'in 1M'],
    ['%sM', 'in %sM'],
    ['1Y', 'in 1Y'],
    ['%sY', 'in %sY']
  ][index]
}
timeago.register('nano_short', locale)

const action = (item) => {
  switch (item.type) {
    case 'CommitCommentEvent':
      return 'commented on commit'

    case 'CreateEvent':
      return `created ${item.action}`

    case 'DeleteEvent':
      return `deleted ${item.action}`

    case 'ForkEvent':
      return 'forked'

    case 'IssueCommentEvent':
      return `${item.action} issue`

    case 'IssuesEvent':
      return `${item.action} issue`

    case 'PublicEvent':
      return 'made public'

    case 'MemberEvent':
      return 'added member'

    case 'SponsorshipEvent':
      return 'sponshorship started'

    case 'PullRequestEvent':
      return `${item.action} pr`

    case 'PullRequestReviewEvent':
      return `pr review ${item.title}`

    case 'PullRequestReviewCommentEvent':
      return 'commented on pr review'

    case 'PushEvent':
      return `pushed commit to ${item.ref}`

    case 'ReleaseEvent':
      return 'published release'

    case 'WatchEvent':
      return 'watching repo'
  }
}

const link = (item) => {
  switch (item.type) {
    case 'ForkEvent':
    case 'CommitCommentEvent':
    case 'ReleaseEvent':
      return item.ref

    case 'IssueCommentEvent':
    case 'IssuesEvent':
    case 'PullRequestEvent':
    case 'PullRequestReviewEvent':
    case 'PullRequestReviewCommentEvent':
      return `#${item.ref}`
  }
}

const GithubEvent = (item, index) => {
  return (
    <div className='github__event' key={index}>
      <div className='github__event-author'>{item.actor_name}</div>
      <div className='github__event-action'>{action(item)}</div>
      {item.event_url && (
        <a href={item.event_url} target='_blank'>
          {link(item)}
        </a>
      )}
      <div className='github__event-time'>
        {timeago.format(item.created_at * 1000, 'nano_short')}
      </div>
    </div>
  )
}

export default class Github extends React.Component {
  render() {
    const { events } = this.props
    const items = events.slice(0, 10).map((i, idx) => GithubEvent(i, idx))

    return (
      <div className='github__container'>
        <div className='github__title'>Development Events</div>
        <div className='github__events'>{items}</div>
      </div>
    )
  }
}

Github.propTypes = {
  events: ImmutablePropTypes.list
}
