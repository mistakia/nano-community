import React from 'react'
import * as timeago from 'timeago.js'
import ImmutablePropTypes from 'react-immutable-proptypes'

import Skeleton from '@material-ui/lab/Skeleton'

import './post.styl'

const formatUrl = (url, type) => {
  switch (type) {
    case 'reddit:raiblocks':
    case 'reddit:nanotrade':
    case 'reddit:nanocurrency':
      return `https://reddit.com${url}`

    default:
      return url
  }
}

const Source = ({ post }) => {
  const type = post.sid.split(':').shift()
  return <div className={`post__source ${type}`}>{post.source_title}</div>
}

Source.propTypes = {
  post: ImmutablePropTypes.record
}

export default class Post extends React.Component {
  render() {
    const { post } = this.props

    if (!post.id) {
      return (
        <div className='post'>
          <div className='post__title'>
            <Skeleton height={30} />
          </div>
          <div className='post__meta'>
            <Skeleton animation='wave' width={200} />
          </div>
        </div>
      )
    }

    const classNames = ['post__title']
    if (post.sid === 'discord:370266023905198083') {
      classNames.push('discord')
    }

    return (
      <div className='post'>
        <a
          className={classNames.join(' ')}
          href={formatUrl(post.main_url, post.sid)}
          rel='noreferrer'
          target='_blank'>
          {post.title || post.text}
        </a>
        <div className='post__meta'>
          <Source post={post} />
          <div>{post.author}</div>
          <div>{timeago.format(post.created_at * 1000)}</div>
        </div>
      </div>
    )
  }
}

Post.propTypes = {
  post: ImmutablePropTypes.record
}
