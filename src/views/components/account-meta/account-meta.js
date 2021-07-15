import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'

import { timeago } from '@core/utils'

export default class AccountMeta extends React.Component {
  render() {
    const { account } = this.props

    const fundingAccount = account.getIn(['open', 'funding_account'], '')
    const fundingTimestamp = account.getIn(['open', 'funding_timestamp'])
    const openTimestamp = account.getIn(['open', 'open_timestamp'])
    const modifiedTimestamp = account.getIn([
      'account_meta',
      'modified_timestamp'
    ])
    const items = [
      {
        label: 'Funding Account',
        value: fundingAccount ? (
          <Link to={`/${fundingAccount}`}>
            {account.getIn(['open', 'funding_alias']) ||
              `${fundingAccount.slice(0, 15)}...`}
          </Link>
        ) : (
          '-'
        )
      },
      {
        label: 'Funding Timestamp',
        value: fundingTimestamp
          ? `${dayjs(fundingTimestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(fundingTimestamp * 1000, 'nano_short')} ago)`
          : 'Unknown'
      },
      {
        label: 'Open Timestamp',
        value: openTimestamp
          ? `${dayjs(openTimestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(openTimestamp * 1000, 'nano_short')} ago)`
          : 'Unknown'
      },
      {
        label: 'Opening Balance',
        value: account.getIn(['open', 'open_balance'])
      },
      {
        label: 'Receivable Balance',
        value: account.getIn(['account_meta', 'pending'])
      },
      {
        label: 'Version',
        value: account.getIn(['account_meta', 'account_version'])
      },
      {
        label: 'Height',
        value: account.getIn(['account_meta', 'confirmation_height'])
      },
      {
        label: 'Last Modified',
        value: `${dayjs(modifiedTimestamp * 1000).format(
          'MMM D, YYYY h:mm a'
        )} (${timeago.format(modifiedTimestamp * 1000, 'nano_short')} ago)`
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='account__section-row' key={idx}>
        <div className='account__section-row-label'>{i.label}</div>
        <div className='account__section-row-value'>{i.value}</div>
      </div>
    ))

    // rep status
    return <div className='account__meta account__section'>{rows}</div>
  }
}

AccountMeta.propTypes = {
  account: ImmutablePropTypes.record
}
