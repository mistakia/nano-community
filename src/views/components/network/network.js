import React from 'react'
import PropTypes from 'prop-types'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Tooltip from '@mui/material/Tooltip'
import ImmutablePropTypes from 'react-immutable-proptypes'

import './network.styl'

// add commas to large number
const formatNumber = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default class Network extends React.Component {
  render() {
    const { network, wattHour, stats, unconfirmed_block_pool_count } =
      this.props

    const prText =
      'as observed across the networks principal representatives: voting nodes with more than 0.1% of the online voting weight delegated to them'

    const confirmationsText =
      'Total number of transactions confirmed by the network over the last 24 hours'
    const settlementText =
      'Total amount of value settled by the network over the last 24 hours'
    const throughputText = `Median number of transactions confirmed per second in the last minute ${prText}`
    const speedText =
      'Time in milliseconds for a test transaction to get confirmed'
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
            {formatNumber(
              network.getIn(['stats', 'TOTAL_CONFIRMATIONS_24H'], 0)
            )}
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
            $
            {formatNumber(
              (
                network.getIn(['stats', 'TOTAL_VOLUME_24H'], 0) *
                network.getIn(['stats', 'currentPrice'], 0)
              ).toFixed(0)
            )}
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
            {network.getIn(['stats', 'CPSMedian_pr'], 0).toFixed(1)} CPS
          </div>
        </div>
        <div className='network__stat'>
          <div>
            Tx Speed
            <Tooltip title={speedText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>{network.getIn(['stats', 'speedTest'])} ms</div>
        </div>
        <div className='network__stat'>
          <div>
            Unconfirmed Blocks
            <Tooltip title={unconfirmed_pool_text}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>{formatNumber(unconfirmed_block_pool_count || 0)}</div>
        </div>
        <div className='network__stat'>
          <div>
            Online Stake
            <Tooltip title={stakeText}>
              <HelpOutlineIcon fontSize='inherit' />
            </Tooltip>
          </div>
          <div>
            {network.getIn(['stats', 'pStakeTotalStat'], 0).toFixed(1)}%
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
          <div>{network.getIn(['stats', 'peersMax'], '-')}</div>
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
  unconfirmed_block_pool_count: PropTypes.number
}
