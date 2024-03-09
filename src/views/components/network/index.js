import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork, getNetworkStats, getNetworkWattHour } from '@core/network'
import { getNetworkUnconfirmedBlockCount } from '@core/accounts'

import Network from './network'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkStats,
  getNetworkWattHour,
  getNetworkUnconfirmedBlockCount,
  (network, stats, wattHour, unconfirmed_block_pool_count) => ({
    network,
    stats,
    wattHour,
    unconfirmed_block_pool_count
  })
)

export default connect(mapStateToProps)(Network)
