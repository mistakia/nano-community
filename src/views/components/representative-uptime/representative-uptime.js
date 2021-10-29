import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import * as timeago from 'timeago.js'

import Uptime from '@components/uptime'

import './representative-uptime.styl'

export default class RepresentativeUptime extends React.Component {
  render() {
    const { uptime } = this.props.account.toJS()

    const lastOnline = this.props.account.get('last_online')
    const lastOffline = this.props.account.get('last_offline')

    const onlineCount = uptime.filter((i) => i.online).length
    const last60 = this.props.account.getIn(['uptime_summary', 'days_60'], {})
    const last60Pct =
      Math.round(
        (last60.online_count / (last60.online_count + last60.offline_count)) *
          10000
      ) / 100
    const last60Class =
      last60Pct > 95
        ? 'online'
        : last60Pct < 70
        ? 'offline'
        : last60Pct < 80
        ? 'warning'
        : ''

    const last90 = this.props.account.getIn(['uptime_summary', 'days_90'], {})
    const last90Pct =
      Math.round(
        (last90.online_count / (last90.online_count + last90.offline_count)) *
          10000
      ) / 100
    const last90Class =
      last90Pct > 95 ? 'online' : last90Pct < 80 ? 'offline' : ''

    let text
    let online = true
    if (!lastOffline) {
      // missing both
      if (!lastOnline) {
        text = 'Operational'
      } else {
        // missing offline, has online
        text = 'Operational'
      }
    } else if (!lastOnline) {
      // missing online, has offline
      text = 'Down'
      online = false
    } else {
      // has both
      if (lastOnline > lastOffline) {
        text = `Up for ${timeago.format(lastOffline * 1000, 'nano_short')}`
      } else {
        text = `Down for ${timeago.format(lastOnline * 1000, 'nano_short')}`
        online = false
      }
    }

    const uptimePct = Math.round((onlineCount / uptime.length) * 10000) / 100
    const uptimeClass =
      uptimePct > 90
        ? 'online'
        : uptimePct < 50
        ? 'offline'
        : uptimePct < 75
        ? 'warning'
        : ''

    return (
      <div className='representative__section representative__uptime'>
        <div className='representative__uptime-metrics'>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header section__label'>
              Current Status
            </div>
            <div
              className={`representative__uptime-metric-body ${
                online ? 'online' : 'offline'
              }`}>
              {text}
            </div>
          </div>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header section__label'>
              2W Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${uptimeClass}`}>
              {uptimePct}%
            </div>
          </div>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header section__label'>
              2M Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${last60Class}`}>
              {last60Pct ? `${last60Pct}%` : '-'}
            </div>
          </div>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header section__label'>
              3M Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${last90Class}`}>
              {last90Pct ? `${last90Pct}%` : '-'}
            </div>
          </div>
        </div>
        <div className='representative__uptime-bar'>
          <Uptime data={uptime} expanded />
        </div>
      </div>
    )
  }
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
