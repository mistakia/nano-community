// The board's web of trust, shared by the view reducer and the relay so both
// derive the same trusted set from the same vouch events. The rules are in
// docs/design/task-board-protocol.md § Web of trust.

import {
  TASK_BOARD_KINDS,
  VOUCH_SET_D_TAG,
  BLOCK_SET_D_TAG,
  VOUCHES_FOR_SECOND_STEP,
  ACCOUNT_ATTESTATION_NAMESPACE,
  ACCOUNT_ATTESTATION_VALUES,
  ACCOUNT_ATTESTATION_LIFETIME_SECONDS,
  PLEDGE_ATTESTATION_NAMESPACE
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

// Earned vouches: a steward's newest verdict on a pledge is paid and names the
// key that was paid (p), so the pledge's author vouches for that key. Returns
// Map<voucher, Set<pubkey>>; build_trust_graph counts them only for vouchers.
export function select_earned_vouches({ events, stewards }) {
  const latest = new Map()
  for (const event of events) {
    if (
      event.kind !== TASK_BOARD_KINDS.label ||
      !stewards.has(event.pubkey) ||
      get_tag_value(event, 'L') !== PLEDGE_ATTESTATION_NAMESPACE
    ) {
      continue
    }
    const address = get_tag_value(event, 'a')
    if (address && is_newer(event, latest.get(address))) {
      latest.set(address, event)
    }
  }
  const earned = new Map()
  for (const [address, event] of latest) {
    const paid = event.tags.some(
      (tag) =>
        tag[0] === 'l' &&
        tag[1] === 'paid' &&
        tag[2] === PLEDGE_ATTESTATION_NAMESPACE
    )
    const paid_pubkeys = event.tags.filter((tag) => tag[0] === 'p')
    const voucher = address.split(':')[1]
    if (!paid || paid_pubkeys.length !== 1 || !voucher) continue
    const pubkey = paid_pubkeys[0][1]
    if (pubkey === voucher) continue
    if (!earned.has(voucher)) earned.set(voucher, new Set())
    earned.get(voucher).add(pubkey)
  }
  return earned
}

// The steward account attestations about each key, as
// Map<pubkey, { value, created_at, expiration, author }>: the newest by any
// current steward wins, and lapses at its expiration (capped at the
// attestation lifetime).
export function select_account_attestations({ events, stewards }) {
  const latest = new Map()
  for (const event of events) {
    if (
      event.kind !== TASK_BOARD_KINDS.label ||
      !stewards.has(event.pubkey) ||
      get_tag_value(event, 'L') !== ACCOUNT_ATTESTATION_NAMESPACE
    ) {
      continue
    }
    const label = event.tags.find(
      (tag) =>
        tag[0] === 'l' &&
        tag[2] === ACCOUNT_ATTESTATION_NAMESPACE &&
        ACCOUNT_ATTESTATION_VALUES.includes(tag[1])
    )
    const pubkey = get_tag_value(event, 'p')
    if (!label || !pubkey) continue
    if (is_newer(event, latest.get(pubkey)?.event)) {
      const max_expiration =
        event.created_at + ACCOUNT_ATTESTATION_LIFETIME_SECONDS
      latest.set(pubkey, {
        event,
        value: label[1],
        expiration: Math.min(
          Number(get_tag_value(event, 'expiration')) || max_expiration,
          max_expiration
        )
      })
    }
  }
  return new Map(
    [...latest].map(([pubkey, { event, value, expiration }]) => [
      pubkey,
      { value, created_at: event.created_at, expiration, author: event.pubkey }
    ])
  )
}

// Keys whose current attestation says their Nano account is established.
export const select_established = ({ attestations, now }) =>
  new Set(
    [...attestations]
      .filter(
        ([, { value, expiration }]) =>
          value === 'established' && expiration > now
      )
      .map(([pubkey]) => pubkey)
  )

// Returns { trusted: Map<pubkey, { step, vouchers }>, blocked: Set<pubkey> }.
// Stewards are step 0 and are not listed. Step 1 keys are vouched for by a
// steward and may vouch themselves. Step 2 keys have two step 1 vouchers, or
// one and an established Nano account; they post but do not vouch. A voucher's
// earned vouches (paid pledges) count like its vouch set.
export function build_trust_graph({
  stewards,
  vouch_sets,
  block_sets,
  established = new Set(),
  earned_vouches = new Map()
}) {
  const vouched_by = (voucher) => [
    ...new Set([
      ...get_vouched(vouch_sets.get(voucher)),
      ...(earned_vouches.get(voucher) || [])
    ])
  ]
  const blocked = new Set()
  for (const steward of stewards) {
    for (const pubkey of get_vouched(block_sets.get(steward))) {
      if (!stewards.has(pubkey)) blocked.add(pubkey)
    }
  }
  const eligible = (pubkey) => !stewards.has(pubkey) && !blocked.has(pubkey)

  const trusted = new Map()
  for (const steward of stewards) {
    for (const pubkey of vouched_by(steward)) {
      if (!eligible(pubkey)) continue
      const entry = trusted.get(pubkey) || { step: 1, vouchers: [] }
      entry.vouchers.push(steward)
      trusted.set(pubkey, entry)
    }
  }

  const second_step = new Map()
  for (const [voucher, entry] of trusted) {
    if (entry.step !== 1) continue
    for (const pubkey of vouched_by(voucher)) {
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
