import React from 'react'
import PropTypes from 'prop-types'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@mui/material/Skeleton'

import GithubLabels from '@components/github-labels'

import './github-issue.styl'

export default function GithubIssue({ issue, hide_status_label }) {
  let labels = issue?.labels || []
  if (hide_status_label) {
    labels = labels.filter((label) => !label.label_name.startsWith('status/'))
  }

  if (!issue.id) {
    return (
      <div className='github__issue'>
        <div className='github__issue-title'>
          <Skeleton height={30} />
        </div>
        <div className='github__issue-meta'>
          <Skeleton animation='wave' width={200} />
        </div>
      </div>
    )
  }

  return (
    <div className='github__issue'>
      <a
        className='github__issue-title'
        href={issue.url}
        rel='noreferrer'
        target='_blank'>
        {issue.title}
      </a>
      <div className='github__issue-meta'>
        <div>
          {issue.repo}#{issue.ref}
        </div>
        <div>{issue.actor_name}</div>
        <div>{timeago.format(issue.updated_at * 1000)}</div>
      </div>
      <GithubLabels labels={labels} />
    </div>
  )
}

GithubIssue.propTypes = {
  issue: ImmutablePropTypes.record,
  hide_status_label: PropTypes.bool
}
