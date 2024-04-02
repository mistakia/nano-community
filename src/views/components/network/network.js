import React from 'react'
import PropTypes from 'prop-types'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Tooltip from '@mui/material/Tooltip'
import ImmutablePropTypes from 'react-immutable-proptypes'

import './network.styl'

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

export default class Network extends React.Component {
  render() {
    const {
      network,
      wattHour,
      stats,
      unconfirmed_block_pool_count,
      send_volume_nano
    } = this.props

    const prText =
      'as observed across the networks principal representatives: voting nodes with more than 0.1% of the online voting weight delegated to them'

    const confirmationsText =
      'Total number of transactions confirmed by the network over the last 24 hours'
    const settlementText =
      'Total amount of value settled by the network over the last 24 hours (only send blocks)'
    const throughputText = `Median number of transactions confirmed per second in the last minute ${prText}`
    const speedText =
      'Median time in milliseconds for a block to get confirmed (across all buckets)'
    const unconfirmed_pool_text = `Number of blocks waiting to be confirmed ${prText}`
    const stakeText =
      'Percentage of delegated Nano weight actively participating in voting'
    const confirmText =
      'The minimum number of representatives needed to confirm transactions'
    const censorText =
      'The minimum number of representatives needed to censor transactions or stall the network'
    const feeText = 'The Nano network operates without fees'
    const energyText =
      'Estimated live network CPU energy usage of Principle Representatives based on collected CPU model info. The estimate is based on CPU TDP, which is the average power, in watts, the processor dissipates when operating at base frequency with all cores active under manufacture-defined, high-complexity workload'

    return (
      <div className='network__container'>
        <div className='network__title'>Network Stats</div>
        <div className='network__stat'>
          <div>
            Confirmations (24h)
            <Tooltip title={confirmationsText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(['stats', 'nanodb', 'confirmations_last_24_hours'])
              ? format_number(
                  network.getIn([
                    'stats',
                    'nanodb',
                    'confirmations_last_24_hours'
                  ])
                )
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Settlement (24h)
            <Tooltip title={settlementText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(['stats', 'current_price_usd'])
              ? `$${format_number(
                  (
                    send_volume_nano *
                    network.getIn(['stats', 'current_price_usd'])
                  ).toFixed(0)
                )}`
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Fees (24h)
            <Tooltip title={feeText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>$0</div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Throughput
            <Tooltip title={throughputText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {/* TODO remove this nanoticker dependency */}
            {network.getIn(['stats', 'nanobrowse', 'CPSMedian_pr'])
              ? `${network
                  .getIn(['stats', 'nanobrowse', 'CPSMedian_pr'])
                  .toFixed(1)} CPS`
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Speed (24h)
            <Tooltip title={speedText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(
              ['stats', 'nanodb', 'median_latency_ms_last_24_hours'],
              0
            )
              ? convert_ms_to_readable_time(
                  network.getIn(
                    ['stats', 'nanodb', 'median_latency_ms_last_24_hours'],
                    0
                  )
                )
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Speed (1h)
            <Tooltip title={speedText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(
              ['stats', 'nanodb', 'median_latency_ms_last_hour'],
              0
            )
              ? convert_ms_to_readable_time(
                  network.getIn(
                    ['stats', 'nanodb', 'median_latency_ms_last_hour'],
                    0
                  )
                )
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Speed (10m)
            <Tooltip title={speedText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(
              ['stats', 'nanodb', 'median_latency_ms_last_10_mins'],
              0
            )
              ? convert_ms_to_readable_time(
                  network.getIn(
                    ['stats', 'nanodb', 'median_latency_ms_last_10_mins'],
                    0
                  )
                )
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Unconfirmed Blocks
            <Tooltip title={unconfirmed_pool_text}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {unconfirmed_block_pool_count != null
              ? format_number(unconfirmed_block_pool_count)
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Online Stake
            <Tooltip title={stakeText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {/* TODO remove this nanoticker dependency */}
            {network.getIn(['stats', 'nanobrowse', 'pStakeTotalStat'])
              ? `${network
                  .getIn(['stats', 'nanobrowse', 'pStakeTotalStat'])
                  .toFixed(1)}%`
              : '-'}
          </div>
        </div>
        <div className='network__stat'>
          <div>Principal Reps</div>
          <div>{stats.prCount || '-'}</div>
        </div>
        <div className='network__stat'>
          <div>Total Reps (24h)</div>
          <div>{network.getIn(['totalReps'], '-')}</div>
        </div>
        <div className='network__stat'>
          <div>Peers</div>
          <div>{network.getIn(['stats', 'nanobrowse', 'peersMax'], '-')}</div>
        </div>
        <div className='network__stat'>
          <div>
            Reps to Confirm
            <Tooltip title={confirmText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>{stats.confirmReps || '-'}</div>
        </div>
        <div className='network__stat'>
          <div>
            Reps to Censor or Stall
            <Tooltip title={censorText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>{stats.censorReps || '-'}</div>
        </div>
        <div className='network__stat'>
          <div>
            Energy Usage (TDP) (24h)
            <Tooltip title={energyText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {wattHour ? `${((wattHour * 24) / 1000).toFixed(2)} kWh` : '-'}
          </div>
        </div>
        <a
          href='https://stats.nanobrowse.com/'
          rel='noreferrer'
          className='network__stat-link'
          target='_blank'>
          NanoTicker
        </a>
      </div>
    )
  }
}

Network.propTypes = {
  network: ImmutablePropTypes.map,
  stats: PropTypes.object,
  wattHour: PropTypes.number,
  unconfirmed_block_pool_count: PropTypes.number,
  send_volume_nano: PropTypes.number
}
