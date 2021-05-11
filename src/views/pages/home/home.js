import React from 'react'

import Posts from '@components/posts'
import Menu from '@components/menu'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <>
        <div className='posts'>
          <div className='posts__title'>Posts from the community</div>
          <Posts title='Top' id='top' age={168} />
          <Posts title='Trending' id='trending' age={72} />
        </div>
        <Menu />
      </>
    )
  }
}
