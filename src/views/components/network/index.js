import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getNetwork,
  getNetworkStats,
  get_principal_representative_minimum_weight
} from '@core/network'
import { getNetworkUnconfirmedBlockCount } from '@core/accounts'
import { nanodb_actions } from '@core/nanodb'

import Network from './network'

const get_confirmed_buckets = (nanodb, period) =>
  Object.values(
    nanodb.getIn(
      [
        `block_confirmed_summary_${period}`,
        'confirmation_latency_ms_by_bucket'
      ],
      {}
    )
  )

const mapStateToProps = createSelector(
  getNetwork,
  getNetworkStats,
  getNetworkUnconfirmedBlockCount,
  (state) => state.get('nanodb'),
  get_principal_representative_minimum_weight,
  (
    network,
    stats,
    unconfirmed_block_pool_count,
    nanodb,
    principal_representative_minimum_weight
  ) => {
    const nanodb_stats = network.getIn(['stats', 'nanodb']) || null
    const send_volume_raw = nanodb_stats?.send_volume_last_24_hours
    const current_price_usd = network.getIn(['stats', 'current_price_usd'])
    const settlement_usd =
      send_volume_raw && current_price_usd
        ? BigNumber(send_volume_raw)
            .shiftedBy(-30)
            .times(current_price_usd)
            .toNumber()
        : null

    // median latency of the bucket with the median number of confirmed blocks
    const buckets_24h = get_confirmed_buckets(nanodb, '24h')
      .filter((b) => b.confirmed_blocks)
      .sort((a, b) => a.confirmed_blocks - b.confirmed_blocks)
    const median_latency_of_median_bucket_by_confirmed_blocks_24h =
      buckets_24h[Math.floor(buckets_24h.length / 2)]?.median

    const confirmed_blocks_10m = get_confirmed_buckets(nanodb, '10m').reduce(
      (sum, { confirmed_blocks = 0 }) => sum + confirmed_blocks,
      0
    )
    const confirmations_per_second_10m = confirmed_blocks_10m
      ? confirmed_blocks_10m / 600
      : null

    const pr_minimum_weight_nano = principal_representative_minimum_weight
      ? BigNumber(principal_representative_minimum_weight.toString())
          .shiftedBy(-30)
          .toNumber()
      : null

    return {
      nanodb_stats,
      stats,
      total_reps: network.get('totalReps'),
      unconfirmed_block_pool_count,
      settlement_usd,
      confirmations_per_second_10m,
      median_latency_of_median_bucket_by_confirmed_blocks_24h,
      pr_minimum_weight_nano
    }
  }
)

const map_dispatch_to_props = {
  get_blocks_confirmed_summary: nanodb_actions.get_blocks_confirmed_summary
}

export default connect(mapStateToProps, map_dispatch_to_props)(Network)
