import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'

import { timeago } from '@core/utils'

export default class RepresentativeTelemetry extends React.Component {
  render() {
    const { account } = this.props

    const bandwidth = account.getIn(['telemetry', 'bandwidth_cap'])
    const bandwidthValue = bandwidth
      ? `${(bandwidth / (1024 * 1024)).toFixed(1)}Mb`
      : typeof bandwidth !== 'undefined'
      ? 'Unlimited'
      : '-'

    const blockCount = account.getIn(['telemetry', 'block_count'], 0)
    const blockBehind = account.getIn(['telemetry', 'block_behind'], 0)
    const cementedCount = account.getIn(['telemetry', 'cemented_count'], 0)
    const cementedBehind = account.getIn(['telemetry', 'cemented_behind'], 0)
    const uncheckedCount = account.getIn(['telemetry', 'unchecked_count'], 0)
    const telemetryTimestamp = account.getIn(
      ['telemetry', 'telemetry_timestamp'],
      0
    )

    const items = [
      {
        label: 'Peers',
        value: account.getIn(['telemetry', 'peer_count'], '-')
      },
      {
        label: 'Port',
        value: account.getIn(['telemetry', 'port'], '-')
      },
      {
        label: 'Version',
        value: account.getIn(['version'], '-')
      },
      {
        label: 'Bandwidth Limit',
        value: bandwidthValue
      },
      {
        label: 'Blocks',
        value: blockCount ? BigNumber(blockCount).toFormat() : '-'
      },
      {
        label: 'Blocks Diff',
        value: blockBehind ? BigNumber(blockBehind).toFormat() : '-'
      },
      {
        label: 'Conf.',
        value: cementedCount ? BigNumber(cementedCount).toFormat() : '-'
      },
      {
        label: 'Conf. Diff',
        value: cementedBehind ? BigNumber(cementedBehind).toFormat() : '-'
      },
      {
        label: 'Unchecked',
        value: uncheckedCount ? BigNumber(uncheckedCount).toFormat() : '-'
      },
      {
        label: 'Telemetry Timestamp',
        value: telemetryTimestamp
          ? timeago.format(telemetryTimestamp * 1000, 'nano_short')
          : '-'
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='section__row' key={idx}>
        <div className='section__row-label'>{i.label}</div>
        <div className='section__row-value'>{i.value}</div>
      </div>
    ))

    return (
      <div className='representative__section representative__telemetry'>
        <div className='section__heading'>
          <span>Telemetry</span>
        </div>
        {rows}
      </div>
    )
  }
}

RepresentativeTelemetry.propTypes = {
  account: ImmutablePropTypes.record
}
