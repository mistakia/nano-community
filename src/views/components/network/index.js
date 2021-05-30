import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork, getNetworkWattHour } from '@core/network'

import Network from './network'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkWattHour,
  (network, wattHour) => ({ network, wattHour })
)

export default connect(mapStateToProps)(Network)
