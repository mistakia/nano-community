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

    const last240 = this.props.account.getIn(['uptime_summary', 'days_240'], {})
    const last240Pct =
      Math.round(
        (last240.online_count /
          (last240.online_count + last240.offline_count)) *
          10000
      ) / 100
    const last240Class =
      last240Pct > 95 ? 'online' : last240Pct < 80 ? 'offline' : ''

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
        <div className='representative__uptime-bar'>
          <Uptime data={uptime} expanded />
        </div>
        <div className='representative__uptime-metrics'>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header'>
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
            <div className='representative__uptime-metric-header'>
              2W Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${uptimeClass}`}>
              {uptimePct}%
            </div>
          </div>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header'>
              2M Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${last60Class}`}>
              {last60Pct ? `${last60Pct}%` : '-'}
            </div>
          </div>
          <div className='representative__uptime-metrics-metric'>
            <div className='representative__uptime-metric-header'>
              8M Uptime
            </div>
            <div
              className={`representative__uptime-metric-body ${last240Class}`}>
              {last60Pct ? `${last240Pct}%` : '-'}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
