import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

export default function RepresentativeTelemetry({ account }) {
  const { t } = useTranslation()
  const bandwidth = account.getIn(['telemetry', 'bandwidth_cap'])
  const bandwidth_value = bandwidth
    ? `${(bandwidth / (1024 * 1024)).toFixed(1)}Mb`
    : typeof bandwidth !== 'undefined'
    ? t('common.unlimited', 'Unlimited')
    : '-'

  const block_count = account.getIn(['telemetry', 'block_count'], 0)
  const block_behind = account.getIn(['telemetry', 'block_behind'], 0)
  const cemented_count = account.getIn(['telemetry', 'cemented_count'], 0)
  const cemented_behind = account.getIn(['telemetry', 'cemented_behind'], 0)
  const unchecked_count = account.getIn(['telemetry', 'unchecked_count'], 0)
  const telemetry_timestamp = account.getIn(
    ['telemetry', 'telemetry_timestamp'],
    0
  )

  const items = [
    {
      label: t('common.peers', 'Peers'),
      value: account.getIn(['telemetry', 'peer_count'], '-')
    },
    {
      label: t('common.port', 'Port'),
      value: account.getIn(['telemetry', 'port'], '-')
    },
    {
      label: t('common.version', 'Version'),
      value: account.getIn(['version'], '-')
    },
    {
      label: t('common.bandwidth_limit', 'Bandwidth Limit'),
      value: bandwidth_value
    },
    {
      label: t('common.blocks', 'Blocks'),
      value: block_count ? BigNumber(block_count).toFormat() : '-'
    },
    {
      label: t('representative_telemetry.blocks_diff', 'Blocks Diff'),
      value: block_behind ? BigNumber(block_behind).toFormat() : '-'
    },
    {
      label: t('representative_telemetry.conf', 'Conf.'),
      value: cemented_count ? BigNumber(cemented_count).toFormat() : '-'
    },
    {
      label: t('representative_telemetry.conf_diff', 'Conf. Diff'),
      value: cemented_behind ? BigNumber(cemented_behind).toFormat() : '-'
    },
    {
      label: t('common.unchecked', 'Unchecked'),
      value: unchecked_count ? BigNumber(unchecked_count).toFormat() : '-'
    },
    {
      label: t(
        'representative_telemetry.telemetry_timestamp',
        'Telemetry Timestamp'
      ),
      value: telemetry_timestamp
        ? timeago.format(telemetry_timestamp * 1000, 'nano_short')
        : '-'
    }
  ]

  const rows = items.map((item, idx) => (
    <div className='section__row' key={idx}>
      <div className='section__row-label'>{item.label}</div>
      <div className='section__row-value'>{item.value}</div>
    </div>
  ))

  return (
    <div className='representative__section representative__telemetry'>
      <div className='section__heading'>
        <span>{t('representative_telemetry.telemetry', 'Telemetry')}</span>
      </div>
      {rows}
    </div>
  )
}

RepresentativeTelemetry.propTypes = {
  account: ImmutablePropTypes.record
}
