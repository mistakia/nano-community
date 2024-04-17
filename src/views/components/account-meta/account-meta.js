import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import BigNumber from 'bignumber.js'

import { timeago } from '@core/utils'

export default class AccountMeta extends React.Component {
  render() {
    const { account } = this.props

    const fundingAccount = account.getIn(['open', 'funding_account'], '')
    const fundingTimestamp = account.getIn(['open', 'funding_timestamp'])
    const openTimestamp = account.getIn(['open', 'open_timestamp'])
    const openBalance = account.getIn(['open', 'open_balance'])
    const pendingBalance = account.getIn(['account_meta', 'pending'])
    const height = account.getIn(['account_meta', 'confirmation_height'])
    const modifiedTimestamp = account.getIn([
      'account_meta',
      'modified_timestamp'
    ])
    const last_send_timestamp = account.getIn([
      'stats',
      'last_send_block_timestamp'
    ])
    const last_change_timestamp = account.getIn([
      'stats',
      'last_change_block_timestamp'
    ])
    const last_modified_non_epoch = account.getIn([
      'stats',
      'last_non_epoch_block_timestamp'
    ])

    const max_balance = account.getIn(['stats', 'max_balance'])
    const max_balance_timestamp = account.getIn([
      'stats',
      'max_balance_timestamp'
    ])

    const min_balance = account.getIn(['stats', 'min_balance'])
    const min_balance_timestamp = account.getIn([
      'stats',
      'min_balance_timestamp'
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
          : '-'
      },
      {
        label: 'Open Timestamp',
        value: openTimestamp
          ? `${dayjs(openTimestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(openTimestamp * 1000, 'nano_short')} ago)`
          : '-'
      },
      {
        label: 'Opening Balance',
        value: openBalance
          ? BigNumber(openBalance).shiftedBy(-30).toFormat()
          : '-'
      },
      {
        label: 'Maximum Balance',
        value: max_balance
          ? `${BigNumber(max_balance).shiftedBy(-30).toFormat()} (${dayjs(
              max_balance_timestamp * 1000
            ).format('MMM D, YY h:mm a')})`
          : '-'
      },
      {
        label: 'Minimum Balance',
        value: min_balance
          ? `${BigNumber(min_balance).shiftedBy(-30).toFormat()} (${dayjs(
              min_balance_timestamp * 1000
            ).format('MMM D, YY h:mm a')})`
          : '-'
      },
      {
        label: 'Receivable Balance',
        value: pendingBalance
          ? BigNumber(pendingBalance).shiftedBy(-30).toFormat()
          : '-'
      },
      {
        label: 'Version',
        value: account.getIn(['account_meta', 'account_version'], '-')
      },
      {
        label: 'Height',
        value: height ? BigNumber(height).toFormat() : '-'
      },
      {
        label: 'Last Modified',
        value: modifiedTimestamp
          ? `${dayjs(modifiedTimestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(modifiedTimestamp * 1000, 'nano_short')} ago)`
          : '-'
      },
      {
        label: 'Last Modified (non-epoch)',
        value: last_modified_non_epoch
          ? `${dayjs(last_modified_non_epoch * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(
              last_modified_non_epoch * 1000,
              'nano_short'
            )} ago)`
          : '-'
      },
      {
        label: 'Last Send',
        value: last_send_timestamp
          ? `${dayjs(last_send_timestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(
              last_send_timestamp * 1000,
              'nano_short'
            )} ago)`
          : '-'
      },
      {
        label: 'Last Representative Change',
        value: last_change_timestamp
          ? `${dayjs(last_change_timestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(
              last_change_timestamp * 1000,
              'nano_short'
            )} ago)`
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
      <div className='account__meta'>
        <div className='account__section'>
          <div className='section__heading'>
            <span>Account Info</span>
          </div>
          {rows}
        </div>
      </div>
    )
  }
}

AccountMeta.propTypes = {
  account: ImmutablePropTypes.record
}
