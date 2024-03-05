import React from 'react'
import PropTypes from 'prop-types'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Tooltip from '@mui/material/Tooltip'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { useTranslation } from 'react-i18next'

import './network.styl'

// add commas to large number
const formatNumber = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function Network({ network, wattHour, stats }) {
  const { t } = useTranslation()

  const confirmations_text = t(
    'network.confirmations_text',
    'Total number of transactions confirmed by the network over the last 24 hours'
  )
  const settlement_text = t(
    'network.settlement_text',
    'Total amount of value settled by the network over the last 24 hours'
  )
  const throughput_text = t(
    'network.throughput_text',
    'Median number of transactions confirmed per second in the last minute $t(network.pr_text)'
  )
  const speed_text = t(
    'network.speed_text',
    'Time in milliseconds for a test transaction to get confirmed'
  )
  const backlog_text = t(
    'network.backlog_text',
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
          {formatNumber(network.getIn(['stats', 'TOTAL_CONFIRMATIONS_24H'], 0))}
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
        <div>{network.getIn(['stats', 'CPSMedian_pr'], 0).toFixed(1)} CPS</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.tx_speed', 'Tx Speed')}
          <Tooltip title={speed_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>{network.getIn(['stats', 'speedTest'])} ms</div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.tx_backlog', 'Tx Backlog')}
          <Tooltip title={backlog_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>
          {formatNumber(network.getIn(['stats', 'backlogMedianPr'], 0))}
        </div>
      </div>
      <div className='network__stat'>
        <div>
          {t('network.online_stake', 'Online Stake')}
          <Tooltip title={stake_text}>
            <HelpOutlineIcon fontSize='inherit' />
          </Tooltip>
        </div>
        <div>{network.getIn(['stats', 'pStakeTotalStat'], 0).toFixed(1)}%</div>
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
        <div>{network.getIn(['stats', 'peersMax'], '-')}</div>
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
  wattHour: PropTypes.number
}
