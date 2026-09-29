import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Tooltip from '@mui/material/Tooltip'

import './network.styl'

import { format_value } from '@core/utils'

// add commas to large number
const format_number = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// convert milliseconds to a more readable format
const convert_ms_to_readable_time = (ms) => {
  if (ms > 600000) {
    // more than 10 minutes
    return `${(ms / 60000).toFixed(2)} mins`
  } else if (ms > 2500) {
    // more than 2500 ms
    return `${(ms / 1000).toFixed(2)} secs`
  } else {
    return `${ms} ms`
  }
}

const is_present = (value) =>
  value !== null && value !== undefined && value !== ''

const pr_text =
  'as observed across the network principal representatives: voting nodes with more than 0.1% of the online voting weight delegated to them'

export default function Network({
  nanodb_stats,
  stats,
  wattHour,
  total_reps,
  unconfirmed_block_pool_count,
  settlement_usd,
  confirmations_per_second_10m,
  get_blocks_confirmed_summary,
  median_latency_of_median_bucket_by_confirmed_blocks_24h,
  pr_minimum_weight_nano
}) {
  useEffect(() => {
    // 24h summary for `Tx Speed (24h)`, 10m summary for `Tx Throughput`
    get_blocks_confirmed_summary('24h')
    get_blocks_confirmed_summary('10m')
  }, [])

  const rows = [
    {
      label: 'Confirmations (24h)',
      help: 'Total number of transactions confirmed by the network over the last 24 hours',
      value: nanodb_stats?.confirmations_last_24_hours
        ? format_number(nanodb_stats.confirmations_last_24_hours)
        : null
    },
    {
      label: 'Settlement (24h)',
      help: 'Total amount of value settled by the network over the last 24 hours (only send blocks)',
      value: settlement_usd
        ? `$${format_number(settlement_usd.toFixed(0))}`
        : null
    },
    {
      label: 'Tx Fees (24h)',
      help: 'The Nano network operates without fees',
      value: '$0'
    },
    {
      label: 'Tx Throughput (10m)',
      help: 'Average number of transactions confirmed per second over the last 10 minutes',
      value: confirmations_per_second_10m
        ? `${confirmations_per_second_10m.toFixed(1)} CPS`
        : null
    },
    {
      label: 'Tx Speed (24h)',
      help: 'Median time for a block to get confirmed in the bucket with the median number of confirmed blocks in the last 24 hours',
      value: median_latency_of_median_bucket_by_confirmed_blocks_24h
        ? convert_ms_to_readable_time(
            median_latency_of_median_bucket_by_confirmed_blocks_24h
          )
        : null
    },
    {
      label: 'Tx Speed (1h)',
      help: 'Median time for a block to get confirmed (across all buckets)',
      value: nanodb_stats?.median_latency_ms_last_hour
        ? convert_ms_to_readable_time(nanodb_stats.median_latency_ms_last_hour)
        : null
    },
    {
      label: 'Tx Speed (10m)',
      help: 'Median time for a block to get confirmed (across all buckets)',
      value: nanodb_stats?.median_latency_ms_last_10_mins
        ? convert_ms_to_readable_time(
            nanodb_stats.median_latency_ms_last_10_mins
          )
        : null
    },
    {
      label: 'Unconfirmed Blocks',
      help: `Number of blocks waiting to be confirmed ${pr_text}`,
      value: unconfirmed_block_pool_count
    },
    {
      label: 'Online Voting Weight',
      help: 'Nano delegated to representatives that are online and voting',
      value: stats.online_weight_nano
        ? format_value({ value: stats.online_weight_nano })
        : null
    },
    {
      label: 'Principal Reps',
      help: 'Online representatives with at least 0.1% of the trended voting weight delegated to them',
      value: stats.prCount
    },
    {
      label: 'Principal Rep Minimum Weight',
      help: `The minimum weight required to be a principal representative is the trended weight / 1000. Current threshold: ${pr_minimum_weight_nano} Nano`,
      value: pr_minimum_weight_nano
        ? format_value({ value: pr_minimum_weight_nano })
        : null
    },
    {
      label: 'Total Reps (24h)',
      help: 'Representatives seen on the network in the last 24 hours',
      value: total_reps
    },
    {
      label: 'Peers',
      help: 'Highest peer count reported by an online representative',
      value: stats.peers_max
    },
    {
      label: 'Reps to Confirm',
      help: 'The minimum number of representatives needed to confirm transactions',
      value: stats.confirmReps
    },
    {
      label: 'Reps to Censor or Stall',
      help: 'The minimum number of representatives needed to censor transactions or stall the network',
      value: stats.censorReps
    },
    {
      label: 'Energy Usage (TDP) (24h)',
      help: 'Estimated CPU energy usage of online principal representatives based on collected CPU model info. The estimate is based on CPU TDP, the average power, in watts, the processor dissipates when operating at base frequency with all cores active under a manufacturer-defined, high-complexity workload',
      value: wattHour ? `${((wattHour * 24) / 1000).toFixed(2)} kWh` : null
    }
  ].filter((row) => is_present(row.value))

  return (
    <div className='network__container'>
      <div className='network__title'>Network Stats</div>
      {rows.map(({ label, help, value }) => (
        <div className='network__stat' key={label}>
          <div>
            {label}
            <Tooltip title={help}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>{value}</div>
        </div>
      ))}
      {!nanodb_stats && (
        <div className='network__notice'>
          Transaction volume and speed stats are temporarily unavailable.
        </div>
      )}
    </div>
  )
}

Network.propTypes = {
  nanodb_stats: PropTypes.object,
  stats: PropTypes.object,
  wattHour: PropTypes.number,
  total_reps: PropTypes.number,
  unconfirmed_block_pool_count: PropTypes.number,
  settlement_usd: PropTypes.number,
  confirmations_per_second_10m: PropTypes.number,
  get_blocks_confirmed_summary: PropTypes.func,
  median_latency_of_median_bucket_by_confirmed_blocks_24h: PropTypes.number,
  pr_minimum_weight_nano: PropTypes.number
}
