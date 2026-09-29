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
      label: 'Transactions (24h)',
      help: 'Transactions confirmed in the last 24 hours.',
      value: nanodb_stats?.confirmations_last_24_hours
        ? format_number(nanodb_stats.confirmations_last_24_hours)
        : null
    },
    {
      label: 'Value Settled (24h)',
      help: 'USD value of all sends confirmed in the last 24 hours.',
      value: settlement_usd
        ? `$${format_number(settlement_usd.toFixed(0))}`
        : null
    },
    {
      label: 'Fees (24h)',
      help: 'Nano has no transaction fees.',
      value: '$0'
    },
    {
      label: 'Throughput (10m)',
      help: 'Average transactions confirmed per second over the last 10 minutes.',
      value: confirmations_per_second_10m
        ? `${confirmations_per_second_10m.toFixed(1)} CPS`
        : null
    },
    {
      label: 'Confirmation Time (24h)',
      help: 'Median time to confirm a transaction over the last 24 hours, in the bucket with the median volume.',
      value: median_latency_of_median_bucket_by_confirmed_blocks_24h
        ? convert_ms_to_readable_time(
            median_latency_of_median_bucket_by_confirmed_blocks_24h
          )
        : null
    },
    {
      label: 'Confirmation Time (1h)',
      help: 'Median time to confirm a transaction over the last hour.',
      value: nanodb_stats?.median_latency_ms_last_hour
        ? convert_ms_to_readable_time(nanodb_stats.median_latency_ms_last_hour)
        : null
    },
    {
      label: 'Confirmation Time (10m)',
      help: 'Median time to confirm a transaction over the last 10 minutes.',
      value: nanodb_stats?.median_latency_ms_last_10_mins
        ? convert_ms_to_readable_time(
            nanodb_stats.median_latency_ms_last_10_mins
          )
        : null
    },
    {
      label: 'Awaiting Confirmation',
      help: 'Blocks waiting to be confirmed, as reported by the most up-to-date online representative.',
      value: unconfirmed_block_pool_count
    },
    {
      label: 'Online Voting Weight',
      help: 'Nano delegated to representatives that are online and voting.',
      value: stats.online_weight_nano
        ? format_value({ value: stats.online_weight_nano })
        : null
    },
    {
      label: 'Principal Representatives',
      help: 'Online representatives holding at least 0.1% of voting weight. Their votes confirm transactions.',
      value: stats.prCount
    },
    {
      label: 'Principal Threshold',
      help: 'Minimum voting weight to be a principal representative: the trended online weight divided by 1,000.',
      value: pr_minimum_weight_nano
        ? format_value({ value: pr_minimum_weight_nano })
        : null
    },
    {
      label: 'Representatives (24h)',
      help: 'Representatives seen on the network in the last 24 hours.',
      value: total_reps
    },
    {
      label: 'Peers',
      help: 'Most peers reported by any online representative.',
      value: stats.peers_max
    },
    {
      label: 'Reps to Confirm',
      help: 'Fewest representatives whose combined weight can confirm transactions.',
      value: stats.confirmReps
    },
    {
      label: 'Reps to Censor or Stall',
      help: 'Fewest representatives whose combined weight can censor transactions or stall the network.',
      value: stats.censorReps
    },
    {
      label: 'Energy (24h)',
      help: 'Estimated daily energy use of principal representatives, based on the rated power (TDP) of their CPUs.',
      value: wattHour ? `${((wattHour * 24) / 1000).toFixed(2)} kWh` : null
    }
  ].filter((row) => is_present(row.value))

  return (
    <div className='network__container'>
      <div className='network__title'>Network</div>
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
          Volume and speed stats are temporarily unavailable.
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
