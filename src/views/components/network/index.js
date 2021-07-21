import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork, getNetworkStats, getNetworkWattHour } from '@core/network'

import Network from './network'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkStats,
  getNetworkWattHour,
  (network, stats, wattHour) => ({ network, stats, wattHour })
)

export default connect(mapStateToProps)(Network)
