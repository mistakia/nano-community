import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { nip19 } from 'nostr-tools'

import { get_profile_name, get_task_board_state } from '@core/task-board'
import { short_npub } from './format'

const UNTRUSTED_TITLES = {
  blocked: 'A steward blocked this key.',
  unvouched:
    'Nobody in the web of trust vouches for this key yet, so its tasks stay off the board and its comments do not count toward activity.'
}

// Marks a key that is neither a steward nor trusted, where its words show
// beside trusted ones.
function UntrustedMark({ pubkey }) {
  const standing = useSelector((state) => {
    const board_state = get_task_board_state(state)
    if (!board_state) return null
    if (board_state.blocked.includes(pubkey)) return 'blocked'
    if (
      board_state.stewards.includes(pubkey) ||
      board_state.trusted.includes(pubkey)
    ) {
      return null
    }
    return 'unvouched'
  })
  if (!standing) return null
  return (
    <span className='task-untrusted' title={UNTRUSTED_TITLES[standing]}>
      {standing === 'blocked' ? 'blocked' : 'not vouched for'}
    </span>
  )
}

UntrustedMark.propTypes = {
  pubkey: PropTypes.string.isRequired
}

// A key's kind 0 name when it published one, otherwise its short npub. The
// name is self-asserted, so the full npub stays one hover away. With
// mark_untrusted, a key outside the web of trust carries a quiet marker.
export default function PubkeyName({ pubkey, mark_untrusted }) {
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
  const label = name ? (
    <span className='task-board__name' title={title}>
      {name}
    </span>
  ) : (
    <span className='task-npub' title={title}>
      {short_npub(pubkey)}
    </span>
  )
  if (!mark_untrusted) return label
  return (
    <>
      {label}
      <UntrustedMark pubkey={pubkey} />
    </>
  )
}

PubkeyName.propTypes = {
  pubkey: PropTypes.string.isRequired,
  mark_untrusted: PropTypes.bool
}
