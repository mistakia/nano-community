import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import * as timeago from 'timeago.js'
import { useTranslation } from 'react-i18next'

import Uptime from '@components/uptime'

import './representative-uptime.styl'

export default function RepresentativeUptime({ account }) {
  const { t } = useTranslation()

  const { uptime } = account.toJS()

  const last_online = account.get('last_online')
  const last_offline = account.get('last_offline')

  const online_count = uptime.filter((i) => i.online).length
  const last_60 = account.getIn(['uptime_summary', 'days_60'], {})
  const last_60_pct =
    Math.round(
      (last_60.online_count / (last_60.online_count + last_60.offline_count)) *
        10000
    ) / 100
  const last_60_class =
    last_60_pct > 95
      ? t('common.online', 'online')
      : last_60_pct < 70
      ? t('common.offline', 'offline')
      : last_60_pct < 80
      ? t('representative_uptime.warning', 'warning')
      : ''

  const last_90 = account.getIn(['uptime_summary', 'days_90'], {})
  const last_90_pct =
    Math.round(
      (last_90.online_count / (last_90.online_count + last_90.offline_count)) *
        10000
    ) / 100
  const last_90_class =
    last_90_pct > 95
      ? t('common.online', 'online')
      : last_90_pct < 80
      ? t('common.offline', 'offline')
      : ''

  let text
  let online = true
  if (!last_offline) {
    // missing both
    if (!last_online) {
      text = t('representative_uptime.operational', 'Operational')
    } else {
      // missing offline, has online
      text = t('representative_uptime.operational', 'Operational')
    }
  } else if (!last_online) {
    // missing online, has offline
    text = t('representative_uptime.down', 'Down')
    online = false
  } else {
    // has both
    if (last_online > last_offline) {
      text = `${t('representative_uptime.up_for', 'Up for')} ${timeago.format(
        last_offline * 1000,
        'nano_short'
      )}`
    } else {
      text = `${t(
        'representative_uptime.down_for',
        'Down for'
      )} ${timeago.format(last_online * 1000, 'nano_short')}`
      online = false
    }
  }

  const uptime_pct = Math.round((online_count / uptime.length) * 10000) / 100
  const uptime_class =
    uptime_pct > 90
      ? t('common.online', 'online')
      : uptime_pct < 50
      ? t('common.offline', 'offline')
      : uptime_pct < 75
      ? t('representative_uptime.warning', 'warning')
      : ''

  return (
    <div className='representative__section representative__uptime'>
      <div className='representative__uptime-metrics'>
        <div className='representative__uptime-metrics-metric'>
          <div className='representative__uptime-metric-header section__label'>
            {t('representative_uptime.current_status', 'Current Status')}
          </div>
          <div
            className={`representative__uptime-metric-body ${
              online
                ? t('common.online', 'online')
                : t('common.offline', 'offline')
            }`}>
            {text}
          </div>
        </div>
        <div className='representative__uptime-metrics-metric'>
          <div className='representative__uptime-metric-header section__label'>
            {t('representative_uptime.2w_uptime', '2W Uptime')}
          </div>
          <div className={`representative__uptime-metric-body ${uptime_class}`}>
            {uptime_pct}%
          </div>
        </div>
        <div className='representative__uptime-metrics-metric'>
          <div className='representative__uptime-metric-header section__label'>
            {t('representative_uptime.2m_uptime', '2M Uptime')}
          </div>
          <div
            className={`representative__uptime-metric-body ${last_60_class}`}>
            {last_60_pct ? `${last_60_pct}%` : '-'}
          </div>
        </div>
        <div className='representative__uptime-metrics-metric'>
          <div className='representative__uptime-metric-header section__label'>
            {t('representative_uptime.3m_uptime', '3M Uptime')}
          </div>
          <div
            className={`representative__uptime-metric-body ${last_90_class}`}>
            {last_90_pct ? `${last_90_pct}%` : '-'}
          </div>
        </div>
      </div>
      <div className='representative__uptime-bar'>
        <Uptime data={uptime} expanded />
      </div>
    </div>
  )
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
