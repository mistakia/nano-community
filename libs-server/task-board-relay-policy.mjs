// Write policy for the community task board relay (strfry plugin).
// Accepts only task board events, binds every event to a configured board,
// and rate-limits per pubkey and per IP. Stewards (each board's owner and the
// maintainers of its latest announcement) skip the per-pubkey limit. Only
// stewards and step 1 keys publish vouch sets, only stewards publish block
// sets, and keys outside the web of trust may file a limited number of issues
// a day.
// Rules: docs/design/task-board-protocol.md § Relays.

import {
  TASK_BOARD_KINDS,
  TASK_STATUS_BY_KIND,
  VOUCH_SET_D_TAG,
  BLOCK_SET_D_TAG,
  build_trust_graph,
  is_voucher,
  format_board_address
} from '#common/task-board/index.mjs'

const RATE_LIMIT_WINDOW_SECONDS = 60
const ISSUE_WINDOW_SECONDS = 24 * 60 * 60
export const DEFAULT_RATE_LIMITS = {
  per_pubkey: 30,
  per_ip: 120,
  untrusted_issues_per_day: 10
}

const get_tag_value = (event, name) =>
  (event.tags.find((tag) => tag[0] === name) || [])[1]

const get_tag_values = (event, name) =>
  event.tags.filter((tag) => tag[0] === name).map((tag) => tag[1])

export function create_relay_policy_state({
  boards,
  rate_limits = DEFAULT_RATE_LIMITS
}) {
  return {
    board_addresses: new Set(boards.map(format_board_address)),
    board_owner_by_d_tag: new Map(boards.map((b) => [b.d_tag, b.owner_pubkey])),
    issue_ids: new Set(),
    board_pubkeys: new Set(),
    announcements: new Map(), // d tag -> latest owner announcement
    vouch_sets: new Map(), // pubkey -> latest vouch set
    block_sets: new Map(), // pubkey -> latest block set
    rate_limits: { ...DEFAULT_RATE_LIMITS, ...rate_limits },
    rate_windows: new Map()
  }
}

const is_newer = (event, current) =>
  !current ||
  event.created_at > current.created_at ||
  (event.created_at === current.created_at && event.id < current.id)

export function get_stewards(state) {
  const stewards = new Set(state.board_owner_by_d_tag.values())
  for (const announcement of state.announcements.values()) {
    const maintainers = announcement.tags.find((t) => t[0] === 'maintainers')
    for (const pubkey of (maintainers || []).slice(1)) stewards.add(pubkey)
  }
  return stewards
}

// The web of trust as the board derives it.
export function get_trust(state, stewards = get_stewards(state)) {
  return {
    stewards,
    ...build_trust_graph({
      stewards,
      vouch_sets: state.vouch_sets,
      block_sets: state.block_sets
    })
  }
}

// Seed from events the relay already holds; every stored event was accepted.
export function seed_relay_policy_state(state, events) {
  for (const event of events) record_accepted_event(state, event)
}

function record_accepted_event(state, event) {
  state.board_pubkeys.add(event.pubkey)
  if (
    event.kind === TASK_BOARD_KINDS.issue &&
    state.board_addresses.has(get_tag_value(event, 'a'))
  ) {
    state.issue_ids.add(event.id)
  }
  if (event.kind === TASK_BOARD_KINDS.repository_announcement) {
    const d_tag = get_tag_value(event, 'd')
    if (is_newer(event, state.announcements.get(d_tag))) {
      state.announcements.set(d_tag, event)
    }
  }
  if (event.kind === TASK_BOARD_KINDS.follow_set) {
    const sets =
      get_tag_value(event, 'd') === BLOCK_SET_D_TAG
        ? state.block_sets
        : state.vouch_sets
    if (is_newer(event, sets.get(event.pubkey))) sets.set(event.pubkey, event)
  }
}

const has_board_address = (state, event) =>
  get_tag_values(event, 'a').some((a) => state.board_addresses.has(a))

const references_known_issue = (state, event, tag_names) =>
  tag_names.some((name) =>
    get_tag_values(event, name).some((id) => state.issue_ids.has(id))
  )

const is_board_bound = (state, event) =>
  has_board_address(state, event) ||
  references_known_issue(state, event, ['e', 'E'])

function check_kind_rules(state, event) {
  const { kind } = event

  if (kind === TASK_BOARD_KINDS.issue) {
    return has_board_address(state, event) || 'issue must carry the board a tag'
  }
  if (TASK_STATUS_BY_KIND[kind]) {
    return is_board_bound(state, event) || 'status must reference a board issue'
  }
  if (kind === TASK_BOARD_KINDS.label) {
    return (
      references_known_issue(state, event, ['e']) ||
      'label must reference a board issue'
    )
  }
  if (kind === TASK_BOARD_KINDS.comment) {
    return (
      references_known_issue(state, event, ['E']) ||
      'comment root must be a board issue'
    )
  }
  if (kind === TASK_BOARD_KINDS.claim || kind === TASK_BOARD_KINDS.pledge) {
    return is_board_bound(state, event) || 'must reference a board issue'
  }
  if (kind === TASK_BOARD_KINDS.key_properties) {
    const d_tag = get_tag_value(event, 'd')
    return (
      (state.board_addresses.has(d_tag) &&
        get_tag_values(event, 'a').includes(d_tag)) ||
      'key properties must name the board in d and a'
    )
  }
  if (kind === TASK_BOARD_KINDS.repository_announcement) {
    const owner = state.board_owner_by_d_tag.get(get_tag_value(event, 'd'))
    return owner === event.pubkey || 'not a board announcement from its owner'
  }
  if (kind === TASK_BOARD_KINDS.follow_set) {
    const d_tag = get_tag_value(event, 'd')
    if (d_tag === VOUCH_SET_D_TAG) {
      return (
        is_voucher(get_trust(state), event.pubkey) ||
        'only stewards and keys a steward vouches for publish vouch sets'
      )
    }
    if (d_tag === BLOCK_SET_D_TAG) {
      return (
        get_stewards(state).has(event.pubkey) ||
        'only stewards publish block sets'
      )
    }
    return 'only the vouch and block follow sets are accepted'
  }
  if (
    kind === TASK_BOARD_KINDS.profile ||
    kind === TASK_BOARD_KINDS.nano_identity ||
    kind === TASK_BOARD_KINDS.deletion_request
  ) {
    return (
      state.board_pubkeys.has(event.pubkey) || 'pubkey has no board activity'
    )
  }
  return `kind ${kind} is not accepted`
}

function consume_rate_limit(
  state,
  key,
  limit,
  now,
  window_seconds = RATE_LIMIT_WINDOW_SECONDS
) {
  const window_start = now - (now % window_seconds)
  const window = state.rate_windows.get(key)
  if (!window || window.start !== window_start) {
    state.rate_windows.set(key, { start: window_start, count: 1 })
    return true
  }
  window.count += 1
  return window.count <= limit
}

export function prune_rate_windows(state, now) {
  for (const [key, window] of state.rate_windows) {
    const window_seconds = key.startsWith('issues:')
      ? ISSUE_WINDOW_SECONDS
      : RATE_LIMIT_WINDOW_SECONDS
    if (window.start <= now - window_seconds) state.rate_windows.delete(key)
  }
}

// Returns { action: 'accept' | 'reject', msg } and records accepted events.
// source_type follows strfry: IP4 and IP6 are client writes; Import, Stream
// and Sync are operator-initiated and skip rate limiting.
export function evaluate_relay_event({
  state,
  event,
  source_type,
  source_info,
  now = Math.floor(Date.now() / 1000)
}) {
  const verdict = check_kind_rules(state, event)
  if (verdict !== true) return { action: 'reject', msg: `blocked: ${verdict}` }

  if (source_type === 'IP4' || source_type === 'IP6') {
    const { per_pubkey, per_ip, untrusted_issues_per_day } = state.rate_limits
    const stewards = get_stewards(state)
    const is_steward = stewards.has(event.pubkey)
    if (
      event.kind === TASK_BOARD_KINDS.issue &&
      !is_steward &&
      !get_trust(state, stewards).trusted.has(event.pubkey) &&
      !consume_rate_limit(
        state,
        `issues:${event.pubkey}`,
        untrusted_issues_per_day,
        now,
        ISSUE_WINDOW_SECONDS
      )
    ) {
      return {
        action: 'reject',
        msg: 'rate-limited: daily issue limit for keys outside the web of trust'
      }
    }
    const pubkey_ok =
      is_steward ||
      consume_rate_limit(state, `pubkey:${event.pubkey}`, per_pubkey, now)
    const ip_ok = consume_rate_limit(state, `ip:${source_info}`, per_ip, now)
    if (!pubkey_ok || !ip_ok) {
      return { action: 'reject', msg: 'rate-limited: slow down' }
    }
  }

  record_accepted_event(state, event)
  return { action: 'accept', msg: '' }
}
