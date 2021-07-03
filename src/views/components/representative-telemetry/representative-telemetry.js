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
        value: BigNumber(
          account.getIn(['telemetry', 'block_count'], 0)
        ).toFormat()
      },
      {
        label: 'Blocks Diff',
        value: BigNumber(
          account.getIn(['telemetry', 'block_behind'], 0)
        ).toFormat()
      },
      {
        label: 'Conf.',
        value: BigNumber(
          account.getIn(['telemetry', 'cemented_count'], 0)
        ).toFormat()
      },
      {
        label: 'Conf. Diff',
        value: BigNumber(
          account.getIn(['telemetry', 'cemented_behind'], 0)
        ).toFormat()
      },
      {
        label: 'Unchecked',
        value: BigNumber(
          account.getIn(['telemetry', 'unchecked_count'], 0)
        ).toFormat()
      },
      {
        label: 'Timestamp',
        value: timeago.format(
          account.getIn(['telemetry', 'telemetry_timestamp'], 0) * 1000,
          'nano_short'
        )
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='account__section-row' key={idx}>
        <div className='account__section-row-label'>{i.label}</div>
        <div className='account__section-row-value'>{i.value}</div>
      </div>
    ))

    return <div className='account__section'>{rows}</div>
  }
}

RepresentativeTelemetry.propTypes = {
  account: ImmutablePropTypes.record
}
