import React from 'react'
import PropTypes from 'prop-types'

import Skeleton from '@material-ui/lab/Skeleton'

import './posts.styl'

export default class Posts extends React.Component {
  render() {
    const { title } = this.props
    return (
      <>
        <div className='posts__heading'>
          <span>{title}</span>
        </div>
        <div>
          <Skeleton />
          <Skeleton animation='wave' />
          <Skeleton />
        </div>
      </>
    )
  }
}

Posts.propTypes = {
  title: PropTypes.string
}
