import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'

import Post from '@components/post'
import { Post as PostRecord } from '@core/posts'

import './posts.styl'

export default class Posts extends React.Component {
  componentDidMount() {
    this.props.getPosts(this.props.id)
  }

  render() {
    const { title, posts } = this.props

    let skeletons = new List()
    if (!posts.size) {
      skeletons = skeletons.push(new PostRecord())
      skeletons = skeletons.push(new PostRecord())
      skeletons = skeletons.push(new PostRecord())
    }

    const items = (posts.size ? posts : skeletons).map((p, k) => (
      <Post key={k} post={p} />
    ))

    return (
      <>
        <div className='posts__heading'>
          <span>{title}</span>
        </div>
        <div>{items}</div>
      </>
    )
  }
}

Posts.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  posts: ImmutablePropTypes.list,
  getPosts: PropTypes.func
}
