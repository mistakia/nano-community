import { nip19 } from 'nostr-tools'

export const short_npub = (pubkey) => {
  if (!pubkey) return ''
  const npub = nip19.npubEncode(pubkey)
  return `${npub.slice(0, 10)}…${npub.slice(-4)}`
}

export const format_age = (created_at) => {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - created_at)
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const format_date = (created_at) =>
  new Date(created_at * 1000).toLocaleString()

export const COLUMN_TITLES = {
  in_progress: 'In Progress',
  needs_taker: 'Needs a Taker',
  blocked: 'Blocked or Paused',
  triage: 'Triage',
  draft: 'Draft',
  closed: 'Closed'
}

export const STATUS_TITLES = {
  open: 'Open',
  resolved: 'Resolved',
  closed: 'Closed',
  draft: 'Draft'
}

// Babel turns ** into Math.pow, which cannot take a BigInt.
const RAW_PER_XNO = BigInt('1' + '0'.repeat(30))

// An exact XNO amount from raw, with trailing zeros dropped: 2.5 XNO.
export const format_xno = (raw) => {
  const value = BigInt(raw)
  const whole = value / RAW_PER_XNO
  const fraction = (value % RAW_PER_XNO)
    .toString()
    .padStart(30, '0')
    .replace(/0+$/, '')
  return `${whole}${fraction ? `.${fraction}` : ''} XNO`
}

// Raw from a decimal XNO amount, or null when it is not a positive amount
// with at most 30 decimals. No floats, so it matches the CLI exactly.
export const parse_xno = (amount) => {
  const match = /^([0-9]+)(?:\.([0-9]{1,30}))?$/.exec(String(amount).trim())
  if (!match) return null
  const raw = BigInt(match[1] + (match[2] || '').padEnd(30, '0'))
  return raw > 0n ? raw.toString() : null
}
