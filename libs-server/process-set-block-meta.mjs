import db from '#db'
import { rpc } from '#common'
import { CommunityRequestError } from './verify-community-request.mjs'

export const MAX_NOTE_CODE_POINTS = 500

// Control characters other than newline
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g

// Validates the parameters of a set_block_meta message and returns the block
// hash and the normalized note. An empty note clears the block's note. A note
// over the limit is rejected, never truncated, because a truncated note is not
// the note that was signed.
export function parse_block_note({ content, references }) {
  if (references.length !== 1) {
    throw new CommunityRequestError(
      400,
      'set_block_meta takes exactly one block hash in references'
    )
  }
  const keys = Object.keys(content)
  if (keys.length !== 1 || keys[0] !== 'note') {
    throw new CommunityRequestError(
      400,
      'set_block_meta content must be exactly {note}'
    )
  }
  if (typeof content.note !== 'string') {
    throw new CommunityRequestError(400, 'note must be a string')
  }

  const note = content.note.replace(CONTROL_CHARACTERS_RE, '').trim()
  if ([...note].length > MAX_NOTE_CODE_POINTS) {
    throw new CommunityRequestError(
      400,
      `note must be at most ${MAX_NOTE_CODE_POINTS} characters`
    )
  }

  return { block_hash: references[0], note }
}

// The account that published a confirmed block, or null when the node does
// not know the block or has not confirmed it
export async function get_confirmed_block_account(block_hash) {
  const block_info = await rpc.blockInfo({ hash: block_hash.toUpperCase() })
  if (!block_info) {
    throw new CommunityRequestError(503, 'block lookup unavailable')
  }
  if (block_info.error) {
    return null
  }
  const confirmed =
    block_info.confirmed === true || block_info.confirmed === 'true'
  return confirmed ? block_info.block_account : null
}

export async function assert_block_owner({
  block_hash,
  account,
  get_block_account = get_confirmed_block_account
}) {
  const block_account = await get_block_account(block_hash)
  if (block_account !== account) {
    throw new CommunityRequestError(
      400,
      'the block must be confirmed and published by the signing account'
    )
  }
}

// A note replaces the stored one only when it is newer, ordered by issued_at
// and then by message digest, so the outcome does not depend on the order
// messages arrive in and a rebuild reproduces it.
const is_newer = ({ issued_at, message_digest }, stored) =>
  issued_at > Number(stored.issued_at) ||
  (issued_at === Number(stored.issued_at) &&
    message_digest > stored.message_digest)

// Applies a set_block_meta message to the blocks_meta projection. account is
// the account the signer acts for. Returns whether the note was applied.
export default async function process_set_block_meta({
  content,
  references,
  account,
  issued_at,
  message_digest,
  get_block_account,
  connection = db
}) {
  const { block_hash, note } = parse_block_note({ content, references })
  await assert_block_owner({ block_hash, account, get_block_account })

  const stored = await connection('blocks_meta').where({ block_hash }).first()
  if (stored && !is_newer({ issued_at, message_digest }, stored)) {
    return false
  }

  await connection('blocks_meta')
    .insert({
      block_hash,
      account,
      note,
      message_digest,
      issued_at,
      updated_at: Math.floor(Date.now() / 1000)
    })
    .onConflict('block_hash')
    .merge(['account', 'note', 'message_digest', 'issued_at', 'updated_at'])

  return true
}
