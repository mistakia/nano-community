// Pledges: a public, non-custodial promise by a Nano account to pay whoever
// completes a task (kind 30635, one per author and issue). The proof is a
// canonical-format Nano signature (the nano-signed-message `pledge` profile).
// Like the binding helpers, these build and read events without signing or
// verifying, so the relay can load them with no dependencies. Rules:
// docs/design/task-board-protocol.md § Pledge.

import {
  TASK_BOARD_KINDS,
  ACCOUNT_ATTESTATION_LIFETIME_SECONDS,
  PLEDGE_ATTESTATION_NAMESPACE,
  PLEDGE_ATTESTATION_VALUES
} from './constants.mjs'
import { format_board_address } from './build-task-board-events.mjs'
import {
  NANO_ACCOUNT_RE,
  NANO_PROOF_RE
} from './build-nano-account-binding.mjs'

const EVENT_ID_RE = /^[0-9a-f]{64}$/
const AMOUNT_RE = /^[1-9][0-9]*$/
const BLOCK_HASH_RE = /^[0-9A-F]{64}$/i

const now_seconds = () => Math.floor(Date.now() / 1000)
const get_tag_values = (event, name) =>
  event.tags.filter((tag) => tag[0] === name).map((tag) => tag[1])

// The payload the pledging account signs; `nostr_public_key` is the hex
// pubkey of the pledge event's author.
export const build_pledge_payload = ({
  account,
  issue_event_id,
  amount_raw,
  nostr_public_key,
  issued_at
}) => ({
  version: 1,
  domain: 'nostr',
  action: 'pledge',
  account,
  issued_at,
  parameters: { issue_event_id, amount_raw, nostr_public_key }
})

// The address a pledge is replaced under and labelled by.
export const format_pledge_address = ({ pubkey, issue_id }) =>
  `${TASK_BOARD_KINDS.pledge}:${pubkey}:${issue_id}`

export function build_task_pledge({
  board,
  issue_id,
  account,
  amount_raw,
  issued_at,
  signature,
  payout = null,
  created_at = now_seconds()
}) {
  const proof = `${issued_at}:${String(signature).toLowerCase()}`
  if (!EVENT_ID_RE.test(issue_id)) throw new Error('not an issue id')
  if (!NANO_ACCOUNT_RE.test(account)) throw new Error('not a nano_ account')
  if (!AMOUNT_RE.test(String(amount_raw))) throw new Error('not a raw amount')
  if (!NANO_PROOF_RE.test(proof)) throw new Error('not a valid pledge proof')
  if (payout && !BLOCK_HASH_RE.test(payout)) throw new Error('not a block hash')
  return {
    kind: TASK_BOARD_KINDS.pledge,
    created_at,
    tags: [
      ['d', issue_id],
      ['e', issue_id],
      ['a', format_board_address(board)],
      ['amount', String(amount_raw)],
      ['nano_account', account],
      ['nano_proof', proof],
      ...(payout ? [['payout', payout.toUpperCase()]] : [])
    ],
    content: ''
  }
}

// The pledge a kind 30635 event states, or null when its shape is wrong.
// Shape only; the signature and the chain are not checked here.
export function parse_task_pledge(event) {
  if (!event || event.kind !== TASK_BOARD_KINDS.pledge) return null
  const single = (name) => {
    const values = get_tag_values(event, name)
    return values.length === 1 ? values[0] : null
  }
  const issue_id = single('d')
  const account = single('nano_account')
  const amount_raw = single('amount')
  const proof = NANO_PROOF_RE.exec(single('nano_proof') || '')
  const payouts = get_tag_values(event, 'payout')
  if (
    !EVENT_ID_RE.test(issue_id || '') ||
    !get_tag_values(event, 'e').includes(issue_id) ||
    !NANO_ACCOUNT_RE.test(account || '') ||
    !AMOUNT_RE.test(amount_raw || '') ||
    !proof ||
    payouts.length > 1 ||
    (payouts.length === 1 && !BLOCK_HASH_RE.test(payouts[0]))
  ) {
    return null
  }
  return {
    issue_id,
    account,
    amount_raw,
    issued_at: Number(proof[1]),
    signature: proof[2],
    payout: payouts[0] || null
  }
}

// A steward's verdict on a pledge (kind 1985), naming the pledge address and
// the pledge event it judged. paid does not expire.
export function build_pledge_attestation({
  pledge_event,
  value,
  created_at = now_seconds(),
  expiration = created_at + ACCOUNT_ATTESTATION_LIFETIME_SECONDS
}) {
  if (!PLEDGE_ATTESTATION_VALUES.includes(value)) {
    throw new Error(`invalid pledge attestation: ${value}`)
  }
  const issue_id = get_tag_values(pledge_event, 'd')[0]
  return {
    kind: TASK_BOARD_KINDS.label,
    created_at,
    tags: [
      ['L', PLEDGE_ATTESTATION_NAMESPACE],
      ['l', value, PLEDGE_ATTESTATION_NAMESPACE],
      ['a', format_pledge_address({ pubkey: pledge_event.pubkey, issue_id })],
      ['e', pledge_event.id],
      ...(value === 'paid' ? [] : [['expiration', String(expiration)]])
    ],
    content: ''
  }
}
