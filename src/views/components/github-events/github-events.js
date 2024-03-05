import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@mui/material/Skeleton'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

import './github-events.styl'

const action = ({ item, t }) => {
  switch (item.type) {
    case 'CommitCommentEvent':
      return t(
        'github_events.action.commented_on_commit',
        'commented on commit'
      )

    case 'CreateEvent':
      return t(
        'github_events.action.created',
        { action: item.action },
        `created ${item.action}`
      )

    case 'DeleteEvent':
      return t(
        'github_events.action.deleted',
        { action: item.action },
        `deleted ${item.action}`
      )

    case 'ForkEvent':
      return t('github_events.action.forked', 'forked')

    case 'IssueCommentEvent':
      return t('github_events.action.commented_on_issue', 'commented on issue')

    case 'IssuesEvent':
      return t(
        'github_events.action.issue_action',
        { action: item.action },
        `${item.action} issue`
      )

    case 'PublicEvent':
      return t('github_events.action.made_public', 'made public')

    case 'MemberEvent':
      return t('github_events.action.added_member', 'added member')

    case 'SponsorshipEvent':
      return t(
        'github_events.action.sponsorship_started',
        'sponsorship started'
      )

    case 'PullRequestEvent':
      return t(
        'github_events.action.pr_action',
        { action: item.action },
        `${item.action} pr`
      )

    case 'PullRequestReviewEvent':
      return t(
        'github_events.action.pr_review',
        { title: item.title },
        `pr review ${item.title}`
      )

    case 'PullRequestReviewCommentEvent':
      return t(
        'github_events.action.commented_on_pr_review',
        'commented on pr review'
      )

    case 'PushEvent':
      return t(
        'github_events.action.pushed_commit',
        { ref: item.ref.slice(0, 15) },
        `pushed commit to ${item.ref.slice(0, 15)}`
      )

    case 'ReleaseEvent':
      return t('github_events.action.published_release', 'published release')

    case 'WatchEvent':
      return t('github_events.action.watching_repo', 'watching repo')
  }
}

const link = (item) => {
  switch (item.type) {
    case 'ForkEvent':
    case 'CommitCommentEvent':
    case 'ReleaseEvent':
      return item.ref.slice(0, 15)

    case 'IssueCommentEvent':
    case 'IssuesEvent':
    case 'PullRequestEvent':
    case 'PullRequestReviewEvent':
    case 'PullRequestReviewCommentEvent':
      return `#${item.ref}`
  }
}

const GithubEvent = ({ item, index, t }) => {
  return (
    <div className='github__event' key={index}>
      <div className='github__event-author'>{item.actor_name}</div>
      <div className='github__event-action'>{action({ item, t })}</div>
      {item.event_url && (
        <a href={item.event_url} target='_blank' rel='noreferrer'>
          {link(item)}
        </a>
      )}
      <div className='github__event-time'>
        {timeago.format(item.created_at * 1000, 'nano_short')}
      </div>
    </div>
  )
}

GithubEvent.propTypes = {
  item: ImmutablePropTypes.record,
  index: ImmutablePropTypes.number,
  t: PropTypes.func
}

export default function GithubEvents({ events }) {
  const { t } = useTranslation()

  const items = events.map((item, index) => GithubEvent({ item, index, t }))
  const skeletons = new Array(15).fill(undefined)

  return (
    <div className='github__container'>
      <div className='github__title'>
        {t('github_events.events_title', 'Development Events')}
      </div>
      <div className='github__events'>
        {Boolean(items.size) && items}
        {!items.size &&
          skeletons.map((i, idx) => (
            <div className='github__event' key={idx}>
              <Skeleton animation='wave' width='100%' />
            </div>
          ))}
      </div>
    </div>
  )
}

GithubEvents.propTypes = {
  events: ImmutablePropTypes.list
}
