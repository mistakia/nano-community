import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { Link } from 'react-router-dom'

import { timeago } from '@core/utils'

import './block-note.styl'

// The note the block's account signed for it, shown as plain text
export default function BlockNote({ block }) {
  const { note, account, issued_at } = block.blockNote

  return (
    <div className='block__note'>
      <div className='section__heading'>Account owner note</div>
      <div className='block__note-body'>
        <div className='block__note-text'>{note}</div>
        <div className='block__note-meta'>
          <Link to={`/${account}`}>
            {block.blockAccountAlias || `${account.slice(0, 15)}...`}
          </Link>
          <span>{timeago.format(issued_at * 1000)}</span>
        </div>
      </div>
    </div>
  )
}

BlockNote.propTypes = {
  block: ImmutablePropTypes.record
}
