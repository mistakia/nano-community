import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@mui/material/Skeleton'

import GithubLabels from '@components/github-labels'

import './github-issue.styl'

export default class GithubIssue extends React.Component {
  render() {
    const { issue } = this.props

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
          <div>{timeago.format(issue.created_at * 1000)}</div>
        </div>
        <GithubLabels labels={issue.labels} />
      </div>
    )
  }
}

GithubIssue.propTypes = {
  issue: ImmutablePropTypes.record
}
