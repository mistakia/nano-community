// Nano account binding: a NIP-39 external identity (kind 10011) whose proof is
// a canonical-format Nano signature (the nano-signed-message `bind_nostr_key`
// profile). These helpers build and read the event without signing or
// verifying, so the relay can load them with no dependencies; signers and
// verifiers use the nano-signed-message library. Rules:
// docs/design/task-board-protocol.md § Nano account binding.

import { TASK_BOARD_KINDS } from './constants.mjs'

const NANO_PLATFORM_PREFIX = 'nano:'
export const NANO_ACCOUNT_RE =
  /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/
// A compact Nano signed-message proof, `<issued_at>:<signature>`.
export const NANO_PROOF_RE = /^(0|[1-9][0-9]*):([0-9a-f]{128})$/

export const BIND_NOSTR_KEY_STATEMENT_PREFIX =
  'Verifying that I control the following Nostr public key: '

// The payload the Nano account signs; `npub` is the event author's npub.
export const build_bind_nostr_key_payload = ({ account, npub, issued_at }) => ({
  version: 1,
  domain: 'nostr',
  action: 'bind_nostr_key',
  account,
  issued_at,
  parameters: {},
  statement: `${BIND_NOSTR_KEY_STATEMENT_PREFIX}${npub}`
})

export function build_nano_account_binding({
  account,
  issued_at,
  signature,
  created_at = Math.floor(Date.now() / 1000)
}) {
  const proof = `${issued_at}:${String(signature).toLowerCase()}`
  if (!NANO_ACCOUNT_RE.test(account)) throw new Error('not a nano_ account')
  if (!NANO_PROOF_RE.test(proof)) throw new Error('not a valid binding proof')
  return {
    kind: TASK_BOARD_KINDS.nano_identity,
    created_at,
    tags: [['i', `${NANO_PLATFORM_PREFIX}${account}`, proof]],
    content: ''
  }
}

// The binding a kind 10011 event states, or null when it states none or more
// than one. Shape only; the signature is not checked here.
export function parse_nano_account_binding(event) {
  if (!event || event.kind !== TASK_BOARD_KINDS.nano_identity) return null
  const tags = event.tags.filter(
    (tag) =>
      tag[0] === 'i' &&
      typeof tag[1] === 'string' &&
      tag[1].startsWith(NANO_PLATFORM_PREFIX)
  )
  if (tags.length !== 1) return null
  const account = tags[0][1].slice(NANO_PLATFORM_PREFIX.length)
  const proof = NANO_PROOF_RE.exec(tags[0][2] || '')
  if (!NANO_ACCOUNT_RE.test(account) || !proof) return null
  return { account, issued_at: Number(proof[1]), signature: proof[2] }
}
