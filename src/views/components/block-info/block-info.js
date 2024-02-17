import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import LoopIcon from '@mui/icons-material/Loop'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

import './block-info.styl'

function BlockType({ type }) {
  const { t } = useTranslation()
  switch (type) {
    case 'epoch':
      return (
        <div className='block__type epoch'>
          {t('block_type.epoch', 'Epoch')}
        </div>
      )

    case 'send':
      return (
        <div className='block__type send'>{t('block_type.send', 'Send')}</div>
      )

    case 'receive':
      return (
        <div className='block__type receive'>
          {t('block_type.receive', 'Receive')}
        </div>
      )

    case 'change':
      return (
        <div className='block__type change'>
          {t('block_type.change', 'Change')}
        </div>
      )

    case 'open':
      return (
        <div className='block__type open'>{t('block_type.open', 'Open')}</div>
      )
  }
}

BlockType.propTypes = {
  type: PropTypes.string
}

function BlockStatus({ confirmed }) {
  const { t } = useTranslation()
  if (confirmed) {
    return (
      <div className='block__status confirmed'>
        <CheckCircleOutlineIcon />
        {t('block_status.confirmed', 'Confirmed')}
      </div>
    )
  }

  return (
    <div className='block__status unconfirmed'>
      <LoopIcon />
      {t('block_status.unconfirmed', 'Unconfirmed')}
    </div>
  )
}

BlockStatus.propTypes = {
  confirmed: PropTypes.bool
}

export default function BlockInfo({ block, type }) {
  const { t } = useTranslation()
  const timestamp = parseInt(
    block.getIn(['blockInfo', 'local_timestamp'], 0),
    10
  )
  const isConfirmed = block.blockInfo.confirmed === 'true'

  const items = [
    {
      label: t('block_info.status', 'Status'),
      value: <BlockStatus confirmed={isConfirmed} />
    },
    {
      label: t('block_info.operation', 'Operation'),
      value: <BlockType type={type} />
    },
    {
      label: t('block_info.timestamp', 'Timestamp'),
      value: timestamp
        ? `${dayjs(timestamp * 1000).format(
            'MMM D, YYYY h:mm a'
          )} (${timeago.format(timestamp * 1000, 'nano_short')} ago)`
        : '-'
    },
    {
      label: t('block_info.block_account', 'Block Account'),
      value: (
        <Link to={`/${block.blockInfo.block_account}`}>
          {block.blockAccountAlias ||
            `${block.blockInfo.block_account.slice(0, 15)}...`}
        </Link>
      )
    }
  ]

  const rows = items.map((i, idx) => (
    <div className='section__row' key={idx}>
      <div className='section__row-label'>{i.label}</div>
      <div className='section__row-value'>{i.value}</div>
    </div>
  ))

  return <div className='block__info'>{rows}</div>
}

BlockInfo.propTypes = {
  block: ImmutablePropTypes.record,
  type: PropTypes.string
}
