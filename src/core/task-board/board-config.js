// Resolves which board and relays a client reads. The defaults come from the
// protocol constants; `board` (owner pubkey hex or npub, optionally
// `<owner>:<d>`) and `relays` (comma-separated) in the query string or the URL
// fragment override them, so a client can follow a successor board or a new
// relay set without a rebuild.

import { nip19 } from 'nostr-tools'

import {
  TASK_BOARD_OWNER_PUBKEY,
  TASK_BOARD_D_TAG,
  TASK_BOARD_DEFAULT_RELAYS
} from '#common/task-board/constants.mjs'

const parse_params = (location) => {
  const params = new URLSearchParams(location.search)
  const hash_query = location.hash.split('?')[1]
  if (hash_query) {
    for (const [key, value] of new URLSearchParams(hash_query)) {
      params.set(key, value)
    }
  }
  return params
}

const to_hex_pubkey = (value) => {
  if (value.startsWith('npub1')) return nip19.decode(value).data
  if (/^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase()
  return null
}

export function resolve_board_config(location = window.location) {
  const params = parse_params(location)
  let owner_pubkey = TASK_BOARD_OWNER_PUBKEY
  let d_tag = TASK_BOARD_D_TAG
  const board_param = params.get('board')
  if (board_param) {
    const [owner, d] = board_param.split(':')
    owner_pubkey = to_hex_pubkey(owner) || owner_pubkey
    if (d) d_tag = d
  }
  const relays_param = params.get('relays')
  const relays = relays_param
    ? relays_param
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean)
    : TASK_BOARD_DEFAULT_RELAYS
  return { board: owner_pubkey ? { owner_pubkey, d_tag } : null, relays }
}
