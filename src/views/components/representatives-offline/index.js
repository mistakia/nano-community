import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getRepresentatives } from '@core/accounts'

import RepresentativesOffline from './representatives-offline'

const mapStateToProps = createSelector(getRepresentatives, (accounts) => ({
  accounts
}))

export default connect(mapStateToProps)(RepresentativesOffline)
