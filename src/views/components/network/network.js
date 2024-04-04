import React from 'react'
import PropTypes from 'prop-types'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Tooltip from '@mui/material/Tooltip'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { useTranslation } from 'react-i18next'

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

export default function Network({
  network,
  wattHour,
  stats,
  unconfirmed_block_pool_count,
  send_volume_nano
}) {
  const { t } = useTranslation()

  const confirmations_text = t(
    'network.confirmations_text',
    'Total number of transactions confirmed by the network over the last 24 hours'
  )
  const settlement_text = t(
    'network.settlement_text',
    'Total amount of value settled by the network over the last 24 hours (only send blocks)'
  )
  const throughput_text = t(
    'network.throughput_text',
    'Median number of transactions confirmed per second in the last minute $t(network.pr_text)'
  )
  const speed_text = t(
    'network.speed_text',
    'Time in milliseconds for a test transaction to get confirmed'
  )
  const unconfirmed_pool_text = t(
    'network.unconfirmed_pool_text',
    'Median number of transactions waiting to be confirmed $t(network.pr_text)'
  )
  const stake_text = t(
    'network.stake_text',
    'Percentage of delegated Nano weight actively participating in voting'
  )
  const confirm_text = t(
    'network.confirm_text',
    'The minimum number of representatives needed to confirm transactions'
  )
  const censor_text = t(
    'network.censor_text',
    'The minimum number of representatives needed to censor transactions or stall the network'
  )
  const fee_text = t(
    'network.fee_text',
    'The Nano network operates without fees'
  )
  const energy_text = t(
    'network.energy_text',
    'Estimated live network CPU energy usage of Principle Representatives based on collected CPU model info. The estimate is based on CPU TDP, which is the average power, in watts, the processor dissipates when operating at base frequency with all cores active under manufacture-defined, high-complexity workload'
  )

  return (
    <div className='network__container'>
      <div className='network__title'>
        {t('network.stats_title', 'Network Stats')}
      </div>
      <div className='network__stat'>
        <div>
          {t('network.confirmations', 'Confirmations (24h)')}
          <Tooltip title={confirmations_text}>
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
          {t('network.settlement', 'Settlement (24h)')}
          <Tooltip title={settlement_text}>
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
          {t('network.tx_fees', 'Tx Fees (24h)')}
          <Tooltip title={fee_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>$0</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.tx_throughput', 'Tx Throughput')}
          <Tooltip title={throughput_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>
          {/* TODO remove this nanoticker dependency */}
          {network.getIn(['stats', 'nanobrowse', 'CPSMedian_pr'])
            ? `${network
                .getIn(['stats', 'nanobrowse', 'CPSMedian_pr'])
                .toFixed(1)} CPS`
            : '-'}{' '}
        </div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.tx_speed', { time_range: '24h' }, 'Tx Speed (24h)')}
          <Tooltip title={speed_text}>
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
          {t('network.tx_speed', { time_range: '1h' }, 'Tx Speed (1h)')}
        </div>
        <div>
          {network.getIn(['stats', 'nanodb', 'median_latency_ms_last_hour'], 0)
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
          {t('network.tx_speed', { time_range: '10m' }, 'Tx Speed (10m)')}
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
          {t('network.tx_backlog', 'Tx Backlog')}
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
          {t('network.online_stake', 'Online Stake')}
          <Tooltip title={stake_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>
          {/* TODO remove this nanoticker dependency */}
          {network.getIn(['stats', 'nanobrowse', 'pStakeTotalStat'])
            ? `${network
                .getIn(['stats', 'nanobrowse', 'pStakeTotalStat'])
                .toFixed(1)}%`
            : '-'}{' '}
        </div>
      </div>
      <div className='network__stat'>
        <div>{t('network.principal_reps', 'Principal Reps')}</div>
        <div>{stats.prCount || '-'}</div>
      </div>
      <div className='network__stat'>
        <div>{t('network.total_reps', 'Total Reps (24h)')}</div>
        <div>{network.getIn(['totalReps'], '-')}</div>
      </div>
      <div className='network__stat'>
        <div>{t('common.peers', 'Peers')}</div>
        <div>{network.getIn(['stats', 'nanobrowse', 'peersMax'], '-')}</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.reps_to_confirm', 'Reps to Confirm')}
          <Tooltip title={confirm_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>{stats.confirmReps || '-'}</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.reps_to_censor', 'Reps to Censor or Stall')}
          <Tooltip title={censor_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>{stats.censorReps || '-'}</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.energy_usage', 'Energy Usage (TDP) (24h)')}
          <Tooltip title={energy_text}>
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
        {t('network.nano_ticker', 'NanoTicker')}
      </a>
    </div>
  )
}

Network.propTypes = {
  network: ImmutablePropTypes.map,
  stats: PropTypes.object,
  wattHour: PropTypes.number,
  unconfirmed_block_pool_count: PropTypes.number,
  send_volume_nano: PropTypes.number
}
