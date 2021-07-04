import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'

import { timeago } from '@core/utils'

export default class RepresentativeNetwork extends React.Component {
  render() {
    const { account } = this.props

    const items = [
      {
        label: 'Last Seen',
        value: timeago.format(account.getIn(['last_seen']) * 1000, 'nano_short')
      },
      {
        label: 'First Seen',
        value: timeago.format(
          account.getIn(['representative_meta', 'created_at']) * 1000,
          'nano_short'
        )
      },
      {
        label: 'Provider',
        value: account.getIn(['network', 'asname'])
      },
      {
        label: 'ISP',
        value: account.getIn(['network', 'isp'])
      },
      {
        label: 'Country',
        value: account.getIn(['network', 'country'])
      },
      {
        label: 'City',
        value: account.getIn(['network', 'city'])
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='account__section-row' key={idx}>
        <div className='account__section-row-label'>{i.label}</div>
        <div className='account__section-row-value'>{i.value}</div>
      </div>
    ))

    return <div className='account__section'>
      <div className='account__section-metrics'>
        <div className='account__section-metric-label'>Weight Represented</div>
        <div className='account__section-metric-body'>{BigNumber(account.getIn(['account_meta', 'weight']))
          .shiftedBy(-30)
          .toFormat(0)}</div>
      </div>
      {rows}
    </div>
  }
}

RepresentativeNetwork.propTypes = {
  account: ImmutablePropTypes.record
}
