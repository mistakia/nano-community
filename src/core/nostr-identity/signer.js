// Signs task board events with a NIP-07 browser extension when one is present,
// otherwise with a key generated and kept in this browser's localStorage.
// A local key is tied to this origin, so the UI offers export and import.

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19
} from 'nostr-tools'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'

const LOCAL_KEY_STORAGE = 'nostr_local_secret_key'
const BACKED_UP_STORAGE = 'nostr_local_key_backed_up'

const get_storage = () => {
  try {
    return window.localStorage
  } catch (error) {
    return null
  }
}

export const get_nip07 = () =>
  typeof window !== 'undefined' && window.nostr ? window.nostr : null

export function read_local_secret_key() {
  const hex = get_storage()?.getItem(LOCAL_KEY_STORAGE)
  return hex && /^[0-9a-f]{64}$/.test(hex) ? hexToBytes(hex) : null
}

function save_local_secret_key(secret_key, { backed_up }) {
  const storage = get_storage()
  if (!storage) throw new Error('this browser does not allow storing a key')
  storage.setItem(LOCAL_KEY_STORAGE, bytesToHex(secret_key))
  storage.setItem(BACKED_UP_STORAGE, backed_up ? 'true' : 'false')
}

export const is_local_key_backed_up = () =>
  get_storage()?.getItem(BACKED_UP_STORAGE) === 'true'

export function mark_local_key_backed_up() {
  try {
    get_storage()?.setItem(BACKED_UP_STORAGE, 'true')
  } catch (error) {
    // storage full or blocked: the backup prompt shows again next visit
  }
}

export function generate_local_key() {
  const secret_key = generateSecretKey()
  const pubkey = getPublicKey(secret_key)
  save_local_secret_key(secret_key, { backed_up: false })
  return pubkey
}

// Accepts an nsec or 64 hex characters; returns the pubkey.
export function import_local_key(value) {
  const input = String(value || '').trim()
  let secret_key
  if (input.startsWith('nsec1')) {
    const decoded = nip19.decode(input)
    if (decoded.type !== 'nsec') throw new Error('not an nsec key')
    secret_key = decoded.data
  } else if (/^[0-9a-f]{64}$/i.test(input)) {
    secret_key = hexToBytes(input.toLowerCase())
  } else {
    throw new Error('enter an nsec or a 64-character hex key')
  }
  // Derive first: an out-of-range key throws here instead of being stored.
  const pubkey = getPublicKey(secret_key)
  save_local_secret_key(secret_key, { backed_up: true })
  return pubkey
}

export function export_local_key() {
  const secret_key = read_local_secret_key()
  return secret_key ? nip19.nsecEncode(secret_key) : null
}

export function forget_local_key() {
  const storage = get_storage()
  storage?.removeItem(LOCAL_KEY_STORAGE)
  storage?.removeItem(BACKED_UP_STORAGE)
}

export async function get_signer_pubkey(method) {
  if (method === 'nip07') return get_nip07().getPublicKey()
  const secret_key = read_local_secret_key()
  return secret_key ? getPublicKey(secret_key) : null
}

export async function sign_event({ method, template }) {
  if (method === 'nip07') {
    const nip07 = get_nip07()
    if (!nip07)
      throw new Error('the nostr browser extension is no longer available')
    return nip07.signEvent(template)
  }
  const secret_key = read_local_secret_key()
  if (!secret_key) throw new Error('no local key')
  return finalizeEvent(template, secret_key)
}
