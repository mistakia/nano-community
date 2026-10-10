import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { nip19 } from 'nostr-tools'

import { get_profile_name, get_task_board_state } from '@core/task-board'
import { short_npub } from './format'

// A key's kind 0 name when it published one, otherwise its short npub. The
// name is self-asserted, so the full npub stays one hover away.
export default function PubkeyName({ pubkey }) {
  const name = useSelector((state) => get_profile_name(state, pubkey))
  // A confirmed acts_for relation shows on hover, never in the text.
  const acts_for = useSelector((state) => {
    const relations = get_task_board_state(state)?.key_relations[pubkey]
    const confirmed = (relations?.acts_for || []).filter((r) => r.confirmed)
    return confirmed
      .map((r) => get_profile_name(state, r.pubkey) || short_npub(r.pubkey))
      .join(', ')
  })
  const title = `${nip19.npubEncode(pubkey)}${acts_for ? `\nacts for ${acts_for}` : ''}`
  if (!name) {
    return (
      <span className='task-npub' title={title}>
        {short_npub(pubkey)}
      </span>
    )
  }
  return (
    <span className='task-board__name' title={title}>
      {name}
    </span>
  )
}

PubkeyName.propTypes = {
  pubkey: PropTypes.string.isRequired
}
