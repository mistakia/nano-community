// NIP-13 proof of work, read without hashing so the relay can load it with no
// dependencies. The event id must already be verified as the event's hash.
// Rules: docs/design/task-board-protocol.md § Proof of work.

import { TASK_BOARD_KINDS } from './constants.mjs'

const leading_zero_bits = (hex) => {
  let count = 0
  for (const char of hex) {
    const nibble = parseInt(char, 16)
    if (nibble === 0) {
      count += 4
      continue
    }
    return count + Math.clz32(nibble) - 28
  }
  return count
}

// The event's proof of work in bits: the id's leading zero bits, capped at the
// difficulty its nonce tag commits to, so a lucky hash mined for a lower
// target does not count for more. An event without a committed nonce has 0.
export function get_event_pow(event) {
  const nonce = (event.tags || []).find((tag) => tag[0] === 'nonce')
  const committed =
    nonce && /^[0-9]+$/.test(nonce[2] || '') ? Number(nonce[2]) : 0
  if (!committed || !/^[0-9a-f]{64}$/.test(event.id || '')) return 0
  return Math.min(leading_zero_bits(event.id), committed)
}

// Whether a key has standing on the board: a steward, a trusted key, or an
// unblocked established account. Takes sets (or maps) of keys.
export const has_standing = (
  { stewards, trusted, established, blocked },
  pubkey
) =>
  stewards.has(pubkey) ||
  trusted.has(pubkey) ||
  (established.has(pubkey) && !blocked.has(pubkey))

// Whether a key must mine an event of this kind for it to count: issues and
// comments from a key with no standing. Reads the board state's key lists.
export const needs_event_pow = ({ state, pubkey, kind }) =>
  (kind === TASK_BOARD_KINDS.issue || kind === TASK_BOARD_KINDS.comment) &&
  !has_standing(
    {
      stewards: new Set(state.stewards),
      trusted: new Set(state.trusted),
      established: new Set(state.established),
      blocked: new Set(state.blocked)
    },
    pubkey
  )
