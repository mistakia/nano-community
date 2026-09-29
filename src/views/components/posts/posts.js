import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { List } from 'immutable'

import Post from '@components/post'
import { Post as PostRecord } from '@core/posts'

import './posts.styl'

export default class Posts extends React.Component {
  componentDidMount() {
    const { id, age, label } = this.props
    this.props.getPosts(id, { age, label })
  }

  render() {
    const { title, posts, isPending } = this.props

    let skeletons = new List()
    if (isPending) {
      skeletons = skeletons.push(new PostRecord())
      skeletons = skeletons.push(new PostRecord())
      skeletons = skeletons.push(new PostRecord())
    } else if (!posts.size) {
      return null
    }

    const items = (posts.size ? posts : skeletons).map((p, k) => (
      <Post key={k} post={p} />
    ))

    return (
      <div className='posts__container'>
        <div className='header__container'>
          <div className='header__title'>
            <span>{title}</span>
          </div>
        </div>
        <div className='posts__body'>{items}</div>
      </div>
    )
  }
}

Posts.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  age: PropTypes.number,
  label: PropTypes.string,
  posts: ImmutablePropTypes.list,
  isPending: PropTypes.bool,
  getPosts: PropTypes.func
}
