import React from 'react'

import Posts from '@components/posts'
import Menu from '@components/menu'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <>
        <div className='posts'>
          <Posts title='This Week' id='top' />
          <Posts title='Recent' id='trending' />
        </div>
        <Menu />
      </>
    )
  }
}
