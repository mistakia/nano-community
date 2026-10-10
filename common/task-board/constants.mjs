// Nano community task board protocol constants.
// The contract these encode is docs/design/task-board-protocol.md.

export const TASK_BOARD_KINDS = {
  profile: 0,
  deletion_request: 5,
  comment: 1111,
  issue: 1621,
  status_open: 1630,
  status_resolved: 1631,
  status_closed: 1632,
  status_draft: 1633,
  label: 1985,
  nano_identity: 10011,
  follow_set: 30000,
  repository_announcement: 30617,
  claim: 30634,
  pledge: 30635
}

export const TASK_STATUS_KINDS = {
  open: TASK_BOARD_KINDS.status_open,
  resolved: TASK_BOARD_KINDS.status_resolved,
  closed: TASK_BOARD_KINDS.status_closed,
  draft: TASK_BOARD_KINDS.status_draft
}

export const TASK_STATUS_BY_KIND = Object.fromEntries(
  Object.entries(TASK_STATUS_KINDS).map(([status, kind]) => [kind, status])
)

export const TASK_BOARD_D_TAG = 'nano-community-tasks'

// The board-owner key signs only the board announcement; the announcement's
// maintainers are the stewards.
// npub1vjdpn5rkn93slgqn63njkuj5aec870uyjzmmwquezf4tnwzpd2yqvtatxh
export const TASK_BOARD_OWNER_PUBKEY =
  '649a19d07699630fa013d4672b7254ee707f3f8490b7b70399126ab9b8416a88'

// The community relay only while the board soft-launches (operator decision,
// 2026-10-10). The public replicas join when stewards are recruited:
// wss://nos.lol, wss://relay.damus.io and wss://relay.primal.net keep kinds 1985
// and 30634 and honour NIP-40 (checked 2026-10-10). Completeness is asserted on
// the community relay only.
export const TASK_BOARD_DEFAULT_RELAYS = ['wss://relay.nano.community']

export const TASK_PRIORITY_NAMESPACE = 'community.nano.priority'
export const TASK_STATE_NAMESPACE = 'community.nano.state'

// Ordered most to least urgent; the order is the board sort order.
export const TASK_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'unprioritized'
]
export const TASK_STATES = ['blocked', 'paused', 'actionable']

export const TASK_LABEL_VALUES = {
  [TASK_PRIORITY_NAMESPACE]: TASK_PRIORITIES,
  [TASK_STATE_NAMESPACE]: TASK_STATES
}

export const CLAIM_STATUSES = ['active', 'released']
export const CLAIM_LIFETIME_SECONDS = 30 * 24 * 60 * 60

export const TRIAGE_SET_D_TAG = 'nano-community-contributors'

export const BASE_ENTITY_ID_TAG = 'base_entity_id'
export const SUPERSEDES_MARKER = 'supersedes'

export const TASK_BOARD_COLUMNS = [
  'in_progress',
  'needs_taker',
  'blocked',
  'triage',
  'draft',
  'closed'
]
