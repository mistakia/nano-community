import React from 'react'
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
