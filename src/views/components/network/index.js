import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getNetwork, getNetworkStats, getNetworkWattHour } from '@core/network'
import { getNetworkUnconfirmedBlockCount } from '@core/accounts'
import { nanodb_actions } from '@core/nanodb'

import Network from './network'

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkStats,
  getNetworkWattHour,
  getNetworkUnconfirmedBlockCount,
  (state) => state.get('nanodb'),
  (network, stats, wattHour, unconfirmed_block_pool_count, nanodb) => {
    const send_volume_raw = network.getIn(
      ['stats', 'nanodb', 'send_volume_last_24_hours'],
      0
    )
    const send_volume_nano = BigNumber(send_volume_raw)
      .shiftedBy(-30)
      .toNumber()

    const confirmation_latency_by_bucket = nanodb.getIn(
      ['block_confirmed_summary_24h', 'confirmation_latency_ms_by_bucket'],
      {}
    )

    const buckets_sorted_by_confirmed_blocks = Object.keys(
      confirmation_latency_by_bucket
    ).sort((a, b) => {
      return (
        confirmation_latency_by_bucket[a].confirmed_blocks -
        confirmation_latency_by_bucket[b].confirmed_blocks
      )
    })

    const median_bucket =
      buckets_sorted_by_confirmed_blocks[
        Math.floor(buckets_sorted_by_confirmed_blocks.length / 2)
      ]

    const median_latency_of_median_bucket_by_confirmed_blocks_24h =
      confirmation_latency_by_bucket[median_bucket]?.median

    return {
      network,
      stats,
      wattHour,
      unconfirmed_block_pool_count,
      send_volume_nano,
      median_latency_of_median_bucket_by_confirmed_blocks_24h
    }
  }
)

const map_dispatch_to_props = {
  get_blocks_confirmed_summary: nanodb_actions.get_blocks_confirmed_summary
}

export default connect(mapStateToProps, map_dispatch_to_props)(Network)
