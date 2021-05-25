import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp, appActions } from '@core/app'
import { networkActions } from '@core/network'
import { githubActions } from '@core/github'

import App from './app'

App.propTypes = {
  children: PropTypes.element
}

const mapStateToProps = createSelector(getApp, (app) => ({ app }))

const mapDispatchToProps = {
  init: appActions.init,
  getNetworkStats: networkActions.getNetworkStats,
  getGithubEvents: githubActions.getGithubEvents
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
