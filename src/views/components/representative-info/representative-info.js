import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

import { timeago } from '@core/utils'

export default class RepresentativeNetwork extends React.Component {
  render() {
    const { account } = this.props

    const createdAt = account.getIn(['representative_meta', 'created_at'])
    const items = [
      {
        label: 'Last Seen',
        value: account.get('is_online') ? (
          <FiberManualRecordIcon className='green' />
        ) : (
          timeago.format(account.getIn(['last_seen']) * 1000, 'nano_short')
        )
      },
      {
        label: 'First Seen',
        value: createdAt ? timeago.format(createdAt * 1000, 'nano_short') : '-'
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='section__row' key={idx}>
        <div className='section__row-label'>{i.label}</div>
        <div className='section__row-value'>{i.value}</div>
      </div>
    ))

    return (
      <div className='representative__section'>
        <div className='account__section-metrics'>
          <div className='account__section-metric-label section__label'>
            Weight Represented
          </div>
          <div className='account__section-metric-body'>
            {account.getIn(['account_meta', 'weight'])
              ? BigNumber(account.getIn(['account_meta', 'weight']))
                  .shiftedBy(-30)
                  .toFormat(0)
              : '-'}
          </div>
        </div>
        {rows}
      </div>
    )
  }
}

RepresentativeNetwork.propTypes = {
  account: ImmutablePropTypes.record
}
