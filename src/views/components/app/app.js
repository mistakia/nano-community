import React from 'react'
import PropTypes from 'prop-types'

import { localStorageAdapter } from '@core/utils'
import Routes from '@views/routes'

import '@styles/normalize.css'
import '@styles/typography.styl'
import './app.styl'

export default class App extends React.Component {
  async componentDidMount() {
    const token = await localStorageAdapter.getItem('token')
    const key = await localStorageAdapter.getItem('key')
    this.props.init({ token, key })
    this.props.getNetworkStats()
    this.props.getGithubEvents()
  }

  render() {
    return (
      <main>
        <Routes />
      </main>
    )
  }
}

App.propTypes = {
  init: PropTypes.func,
  getNetworkStats: PropTypes.func,
  getGithubEvents: PropTypes.func
}
