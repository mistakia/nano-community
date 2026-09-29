import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork, getNetworkWattHour } from '@core/network'

import NetworkHighlights from './network-highlights'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkWattHour,
  (network, wattHour) => ({
    nanodb_stats: network.getIn(['stats', 'nanodb']) || null,
    wattHour
  })
)

export default connect(mapStateToProps)(NetworkHighlights)
