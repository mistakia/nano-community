import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import LoopIcon from '@material-ui/icons/Loop'
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'

import { timeago } from '@core/utils'

import './block-info.styl'

function BlockType({ type }) {
  switch (type) {
    case 'epoch':
      return <div className='block__type epoch'>Epoch</div>

    case 'send':
      return <div className='block__type send'>Send</div>

    case 'receive':
      return <div className='block__type receive'>Receive</div>

    case 'change':
      return <div className='block__type change'>Change</div>

    case 'open':
      return <div className='block__type open'>Open</div>
  }
}

BlockType.propTypes = {
  type: PropTypes.string
}

function BlockStatus({ confirmed }) {
  if (confirmed) {
    return (
      <div className='block__status confirmed'>
        <CheckCircleOutlineIcon />
        Confirmed
      </div>
    )
  }

  return (
    <div className='block__status unconfirmed'>
      <LoopIcon />
      Unconfirmed
    </div>
  )
}

BlockStatus.propTypes = {
  confirmed: PropTypes.bool
}

export default class BlockInfo extends React.Component {
  render() {
    const { block, type } = this.props

    const timestamp = parseInt(
      block.getIn(['blockInfo', 'local_timestamp'], 0),
      10
    )
    // const previous = block.getIn(['blockInfo', 'contents', 'previous'])
    const isConfirmed = block.blockInfo.confirmed === 'true'

    const items = [
      {
        label: 'Status',
        value: <BlockStatus confirmed={isConfirmed} />
      },
      {
        label: 'Operation',
        value: <BlockType type={type} />
      },
      {
        label: 'Timestamp',
        value: timestamp
          ? `${dayjs(timestamp * 1000).format(
              'MMM D, YYYY h:mm a'
            )} (${timeago.format(timestamp * 1000, 'nano_short')} ago)`
          : '-'
      },
      {
        label: 'Block Account',
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
}

BlockInfo.propTypes = {
  block: ImmutablePropTypes.record,
  type: PropTypes.string
}
