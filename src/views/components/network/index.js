import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getNetwork, getNetworkStats, getNetworkWattHour } from '@core/network'
import { getNetworkUnconfirmedBlockCount } from '@core/accounts'

import Network from './network'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkStats,
  getNetworkWattHour,
  getNetworkUnconfirmedBlockCount,
  (network, stats, wattHour, unconfirmed_block_pool_count) => {
    const send_volume_raw = network.getIn(
      ['stats', 'nanodb', 'send_volume_last_24_hours'],
      0
    )
    const send_volume_nano = BigNumber(send_volume_raw)
      .shiftedBy(-30)
      .toNumber()
    return {
      network,
      stats,
      wattHour,
      unconfirmed_block_pool_count,
      send_volume_nano
    }
  }
)

export default connect(mapStateToProps)(Network)
