import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

export default function RepresentativeNetwork({ account }) {
  const { t } = useTranslation()
  const created_at = account.getIn(['representative_meta', 'created_at'])
  const items = [
    {
      label: t('representative_info.last_seen', 'Last Seen'),
      value: account.get('is_online') ? (
        <FiberManualRecordIcon className='green' />
      ) : (
        timeago.format(account.getIn(['last_seen']) * 1000, 'nano_short')
      )
    },
    {
      label: t('representative_info.first_seen', 'First Seen'),
      value: created_at ? timeago.format(created_at * 1000, 'nano_short') : '-'
    }
  ]

  const rows = items.map((item, idx) => (
    <div className='section__row' key={idx}>
      <div className='section__row-label'>{item.label}</div>
      <div className='section__row-value'>{item.value}</div>
    </div>
  ))

  return (
    <div className='representative__section'>
      <div className='account__section-metrics'>
        <div className='account__section-metric-label section__label'>
          {t('representative_info.weight_represented', 'Weight Represented')}
        </div>
        <div className='account__section-metric-body'>
          {BigNumber(account.getIn(['account_meta', 'weight']))
            .shiftedBy(-30)
            .toFormat(0)}
        </div>
      </div>
      {rows}
    </div>
  )
}

RepresentativeNetwork.propTypes = {
  account: ImmutablePropTypes.record
}
