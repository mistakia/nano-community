import React from 'react'
import PropTypes from 'prop-types'

import { localStorageAdapter } from '@core/utils'
import Routes from '@views/routes'
import Notification from '@components/notification'

import '@styles/normalize.css'
import '@styles/typography.styl'
import '@styles/doc.styl'
import '@styles/header.styl'
import '@styles/markdown.styl'
import '@styles/toggle-button-group.styl'

export default class App extends React.Component {
  async componentDidMount() {
    const token = await localStorageAdapter.getItem('token')
    const key = await localStorageAdapter.getItem('key')
    this.props.init({ token, key })
    this.props.getRepresentatives()
    this.props.getNetworkStats()
    this.props.getGithubEvents()
    this.props.getWeight()
  }

  render() {
    return (
      <>
        <Routes />
        <Notification />
      </>
    )
  }
}

App.propTypes = {
  init: PropTypes.func,
  getNetworkStats: PropTypes.func,
  getGithubEvents: PropTypes.func,
  getRepresentatives: PropTypes.func,
  getWeight: PropTypes.func
}
