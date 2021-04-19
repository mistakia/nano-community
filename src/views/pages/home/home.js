import React from 'react'

import Posts from '@components/posts'
import Menu from '@components/menu'

export default class HomePage extends React.Component {
  render() {
    return (
      <>
        <Posts title='This Week' id='top' />
        <Posts title='Recent' id='trending' />
        <Menu />
      </>
    )
  }
}
