import React from 'react'

import Posts from '@components/posts'
import Menu from '@components/menu'

import '@styles/typography.styl'
import './app.styl'

export default class App extends React.Component {
  render() {
    return (
      <main>
        <Posts title='This Month' />
        <Posts title='Recent' />
        <Menu />
      </main>
    )
  }
}
