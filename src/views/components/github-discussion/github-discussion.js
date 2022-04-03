import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Skeleton from '@material-ui/lab/Skeleton'

// import GithubLabels from '@components/github-labels'

import './github-discussion.styl'

export default class GithubDiscussion extends React.Component {
  render() {
    const { discussion } = this.props

    if (!discussion.id) {
      return (
        <div className='github__discussion'>
          <div className='github__discussion-title'>
            <Skeleton height={30} />
          </div>
          <div className='github__discussion-meta'>
            <Skeleton animation='wave' width={200} />
          </div>
        </div>
      )
    }

    return (
      <div className='github__discussion'>
        <a
          className='github__discussion-title'
          href={discussion.url}
          rel='noreferrer'
          target='_blank'>
          {discussion.title}
        </a>
        <div className='github__discussion-meta'>
          <div>
            {discussion.repo}#{discussion.ref}
          </div>
          <div>{discussion.actor_name}</div>
          <div>{timeago.format(discussion.updated_at * 1000)}</div>
        </div>
        {/* <GithubLabels labels={discussion.labels} /> */}
      </div>
    )
  }
}

GithubDiscussion.propTypes = {
  discussion: ImmutablePropTypes.record
}
