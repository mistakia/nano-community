import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

export default function AccountMeta({ account }) {
  const { t } = useTranslation()
  const funding_account = account.getIn(['open', 'funding_account'], '')
  const funding_timestamp = account.getIn(['open', 'funding_timestamp'])
  const open_timestamp = account.getIn(['open', 'open_timestamp'])
  const open_balance = account.getIn(['open', 'open_balance'])
  const pending_balance = account.getIn(['account_meta', 'pending'])
  const height = account.getIn(['account_meta', 'confirmation_height'])
  const modified_timestamp = account.getIn([
    'account_meta',
    'modified_timestamp'
  ])
  const items = [
    {
      label: t('account_meta.funding_account', 'Funding Account'),
      value: funding_account ? (
        <Link to={`/${funding_account}`}>
          {account.getIn(['open', 'funding_alias']) ||
            `${funding_account.slice(0, 15)}...`}
        </Link>
      ) : (
        '-'
      )
    },
    {
      label: t('account_meta.funding_timestamp', 'Funding Timestamp'),
      value: funding_timestamp
        ? `${dayjs(funding_timestamp * 1000).format(
            'MMM D, YYYY h:mm a'
          )} (${timeago.format(funding_timestamp * 1000, 'nano_short')} ago)`
        : '-'
    },
    {
      label: t('account_meta.open_timestamp', 'Open Timestamp'),
      value: open_timestamp
        ? `${dayjs(open_timestamp * 1000).format(
            'MMM D, YYYY h:mm a'
          )} (${timeago.format(open_timestamp * 1000, 'nano_short')} ago)`
        : '-'
    },
    {
      label: t('account_meta.opening_balance', 'Opening Balance'),
      value: open_balance
        ? BigNumber(open_balance).shiftedBy(-30).toFormat()
        : '-'
    },
    {
      label: t('account_meta.receivable_balance', 'Receivable Balance'),
      value: pending_balance
        ? BigNumber(pending_balance).shiftedBy(-30).toFormat()
        : '-'
    },
    {
      label: t('common.version', 'Version'),
      value: account.getIn(['account_meta', 'account_version'], '-')
    },
    {
      label: t('account_meta.height', 'Height'),
      value: height ? BigNumber(height).toFormat() : '-'
    },
    {
      label: t('account_meta.last_modified', 'Last Modified'),
      value: modified_timestamp
        ? `${dayjs(modified_timestamp * 1000).format(
            'MMM D, YYYY h:mm a'
          )} (${timeago.format(modified_timestamp * 1000, 'nano_short')} ago)`
        : '-'
    }
  ]

  const rows = items.map((item, idx) => (
    <div className='section__row' key={idx}>
      <div className='section__row-label'>{item.label}</div>
      <div className='section__row-value'>{item.value}</div>
    </div>
  ))

  return (
    <div className='account__meta'>
      <div className='account__section'>
        <div className='section__heading'>
          <span>{t('account_meta.account_info', 'Account Info')}</span>
        </div>
        {rows}
      </div>
    </div>
  )
}

AccountMeta.propTypes = {
  account: ImmutablePropTypes.record
}
