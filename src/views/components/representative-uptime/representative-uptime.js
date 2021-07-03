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
      <div className='account__section representative__uptime'>
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
        </div>
      </div>
    )
  }
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
