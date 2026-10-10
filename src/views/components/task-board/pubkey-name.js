import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { nip19 } from 'nostr-tools'

import { get_profile_name } from '@core/task-board'
import { short_npub } from './format'

// A key's kind 0 name when it published one, otherwise its short npub. The
// name is self-asserted, so the full npub stays one hover away.
export default function PubkeyName({ pubkey }) {
  const name = useSelector((state) => get_profile_name(state, pubkey))
  if (!name) {
    return (
      <span className='task-npub' title={nip19.npubEncode(pubkey)}>
        {short_npub(pubkey)}
      </span>
    )
  }
  return (
    <span className='task-board__name' title={nip19.npubEncode(pubkey)}>
      {name}
    </span>
  )
}

PubkeyName.propTypes = {
  pubkey: PropTypes.string.isRequired
}
