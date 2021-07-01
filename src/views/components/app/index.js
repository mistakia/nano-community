import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp, appActions } from '@core/app'
import { networkActions } from '@core/network'
import { githubActions } from '@core/github'
import { accountsActions } from '@core/accounts'

import App from './app'

App.propTypes = {
  children: PropTypes.element
}

const mapStateToProps = createSelector(getApp, (app) => ({ app }))

const mapDispatchToProps = {
  init: appActions.init,
  getRepresentatives: accountsActions.getRepresentatives,
  getNetworkStats: networkActions.getNetworkStats,
  getGithubEvents: githubActions.getGithubEvents,
  getWeight: networkActions.getWeight
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
