import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork, getNetworkWattHour } from '@core/network'

import NetworkHighlights from './network-highlights'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkWattHour,
  (network, energy) => ({
    nanodb_stats: network.getIn(['stats', 'nanodb']) || null,
    energy
  })
)

export default connect(mapStateToProps)(NetworkHighlights)
