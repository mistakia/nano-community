// The board's web of trust, shared by the view reducer and the relay so both
// derive the same trusted set from the same vouch events. The rules are in
// docs/design/task-board-protocol.md § Web of trust.

import {
  TASK_BOARD_KINDS,
  VOUCH_SET_D_TAG,
  BLOCK_SET_D_TAG,
  VOUCHES_FOR_SECOND_STEP
} from './constants.mjs'

const get_tag_value = (event, name) =>
  (event.tags.find((tag) => tag[0] === name) || [])[1]

const get_vouched = (event) =>
  event
    ? [
        ...new Set(
          event.tags
            .filter(
              (tag) => tag[0] === 'p' && tag[1] && tag[1] !== event.pubkey
            )
            .map((tag) => tag[1])
        )
      ]
    : []

// Newer wins; on equal created_at the lowest id wins.
const is_newer = (candidate, current) =>
  !current ||
  candidate.created_at > current.created_at ||
  (candidate.created_at === current.created_at && candidate.id < current.id)

// Each key's latest vouch set and latest block set, from any mix of events.
export function select_trust_sets(events) {
  const vouch_sets = new Map()
  const block_sets = new Map()
  for (const event of events) {
    if (event.kind !== TASK_BOARD_KINDS.follow_set) continue
    const d_tag = get_tag_value(event, 'd')
    const sets =
      d_tag === VOUCH_SET_D_TAG
        ? vouch_sets
        : d_tag === BLOCK_SET_D_TAG
          ? block_sets
          : null
    if (sets && is_newer(event, sets.get(event.pubkey))) {
      sets.set(event.pubkey, event)
    }
  }
  return { vouch_sets, block_sets }
}

// Returns { trusted: Map<pubkey, { step, vouchers }>, blocked: Set<pubkey> }.
// Stewards are step 0 and are not listed. Step 1 keys are vouched for by a
// steward and may vouch themselves. Step 2 keys have two step 1 vouchers, or
// one and an established Nano account; they post but do not vouch.
export function build_trust_graph({
  stewards,
  vouch_sets,
  block_sets,
  established = new Set()
}) {
  const blocked = new Set()
  for (const steward of stewards) {
    for (const pubkey of get_vouched(block_sets.get(steward))) {
      if (!stewards.has(pubkey)) blocked.add(pubkey)
    }
  }
  const eligible = (pubkey) => !stewards.has(pubkey) && !blocked.has(pubkey)

  const trusted = new Map()
  for (const steward of stewards) {
    for (const pubkey of get_vouched(vouch_sets.get(steward))) {
      if (!eligible(pubkey)) continue
      const entry = trusted.get(pubkey) || { step: 1, vouchers: [] }
      entry.vouchers.push(steward)
      trusted.set(pubkey, entry)
    }
  }

  const second_step = new Map()
  for (const [voucher, entry] of trusted) {
    if (entry.step !== 1) continue
    for (const pubkey of get_vouched(vouch_sets.get(voucher))) {
      if (!eligible(pubkey) || trusted.has(pubkey)) continue
      if (!second_step.has(pubkey)) second_step.set(pubkey, [])
      second_step.get(pubkey).push(voucher)
    }
  }
  for (const [pubkey, vouchers] of second_step) {
    if (vouchers.length >= VOUCHES_FOR_SECOND_STEP || established.has(pubkey)) {
      trusted.set(pubkey, { step: 2, vouchers })
    }
  }

  for (const entry of trusted.values()) entry.vouchers.sort()
  return { trusted, blocked }
}

// Whether a key's vouches count: stewards and step 1 keys.
export const is_voucher = ({ stewards, trusted }, pubkey) =>
  stewards.has(pubkey) || trusted.get(pubkey)?.step === 1
