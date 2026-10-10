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
