import React from 'react'
import PropTypes from 'prop-types'

import { localStorageAdapter } from '@core/utils'
import Posts from '@components/posts'
import Menu from '@components/menu'

import '@styles/normalize.css'
import '@styles/typography.styl'
import './app.styl'

export default class App extends React.Component {
  async componentDidMount() {
    const token = await localStorageAdapter.getItem('token')
    const key = await localStorageAdapter.getItem('key')
    this.props.init({ token, key })
  }

  render() {
    return (
      <main>
        <Posts title='This Month' id='top' />
        <Posts title='Recent' id='trending' />
        <Menu />
      </main>
    )
  }
}

App.propTypes = {
  init: PropTypes.func
}
