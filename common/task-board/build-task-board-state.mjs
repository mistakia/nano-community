// Pure view reducer for the Nano community task board. Every client is
// expected to derive the same board from the same events; the rules are in
// docs/design/task-board-protocol.md § Default view rules.
//
// Events are assumed signature-verified by the caller (nostr-tools pools
// verify on receipt).

import {
  TASK_BOARD_KINDS,
  TASK_STATUS_BY_KIND,
  TASK_PRIORITY_NAMESPACE,
  TASK_STATE_NAMESPACE,
  TASK_PRIORITIES,
  TASK_LABEL_VALUES,
  TASK_BOARD_COLUMNS,
  TRIAGE_SET_D_TAG,
  BASE_ENTITY_ID_TAG,
  SUPERSEDES_MARKER,
  CLAIM_LIFETIME_SECONDS
} from './constants.mjs'
import {
  format_board_address,
  now_seconds
} from './build-task-board-events.mjs'

const get_tag_value = (event, name) =>
  (event.tags.find((tag) => tag[0] === name) || [])[1]

const get_tag_values = (event, name) =>
  event.tags.filter((tag) => tag[0] === name).map((tag) => tag[1])

// Newer wins; on equal created_at the lowest id wins.
export const is_newer_event = (candidate, current) =>
  !current ||
  candidate.created_at > current.created_at ||
  (candidate.created_at === current.created_at && candidate.id < current.id)

const keep_newest = (map, key, event) => {
  if (is_newer_event(event, map.get(key))) map.set(key, event)
}

const get_root_issue_id = (event) => {
  const root = event.tags.find((tag) => tag[0] === 'e' && tag[3] === 'root')
  return root ? root[1] : get_tag_value(event, 'e')
}

const priority_rank = (priority) => {
  const rank = TASK_PRIORITIES.indexOf(priority)
  return rank === -1 ? TASK_PRIORITIES.length : rank
}

export const compare_tasks = (a, b) =>
  priority_rank(a.priority) - priority_rank(b.priority) ||
  b.latest_activity_at - a.latest_activity_at ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const get_task_column = (task) => {
  if (task.status === 'draft') return 'draft'
  if (task.status !== 'open') return 'closed'
  if (task.active_claimants.length) return 'in_progress'
  if (task.state === 'blocked' || task.state === 'paused') return 'blocked'
  if (!task.priority) return 'triage'
  return 'needs_taker'
}

export default function build_task_board_state({
  events,
  board,
  now = now_seconds()
}) {
  const board_address = format_board_address(board)
  const unique_events = [...new Map(events.map((e) => [e.id, e])).values()]

  // Deletion requests only remove the requester's own events.
  const deleted_ids = new Set()
  const event_by_id = new Map(unique_events.map((e) => [e.id, e]))
  for (const event of unique_events) {
    if (event.kind !== TASK_BOARD_KINDS.deletion_request) continue
    for (const id of get_tag_values(event, 'e')) {
      const target = event_by_id.get(id)
      if (target && target.pubkey === event.pubkey) deleted_ids.add(id)
    }
  }
  const live_events = unique_events.filter(
    (e) =>
      !deleted_ids.has(e.id) && e.kind !== TASK_BOARD_KINDS.deletion_request
  )

  // Steward set: the owner plus maintainers of the latest announcement.
  let announcement = null
  for (const event of live_events) {
    if (
      event.kind === TASK_BOARD_KINDS.repository_announcement &&
      event.pubkey === board.owner_pubkey &&
      get_tag_value(event, 'd') === board.d_tag &&
      is_newer_event(event, announcement)
    ) {
      announcement = event
    }
  }
  const stewards = new Set([board.owner_pubkey])
  if (announcement) {
    const maintainers_tag = announcement.tags.find(
      (t) => t[0] === 'maintainers'
    )
    for (const pubkey of (maintainers_tag || []).slice(1)) stewards.add(pubkey)
  }

  // Trusted set: union of every steward's latest triage follow set.
  const triage_sets = new Map()
  for (const event of live_events) {
    if (
      event.kind === TASK_BOARD_KINDS.follow_set &&
      stewards.has(event.pubkey) &&
      get_tag_value(event, 'd') === TRIAGE_SET_D_TAG
    ) {
      keep_newest(triage_sets, event.pubkey, event)
    }
  }
  const trusted = new Set()
  for (const event of triage_sets.values()) {
    for (const pubkey of get_tag_values(event, 'p')) trusted.add(pubkey)
  }

  const tasks = new Map()
  for (const event of live_events) {
    if (
      event.kind !== TASK_BOARD_KINDS.issue ||
      get_tag_value(event, 'a') !== board_address
    ) {
      continue
    }
    const supersedes = event.tags.find(
      (tag) => tag[0] === 'e' && tag[3] === SUPERSEDES_MARKER
    )
    tasks.set(event.id, {
      id: event.id,
      pubkey: event.pubkey,
      subject: get_tag_value(event, 'subject') || '',
      content: event.content,
      topics: get_tag_values(event, 't'),
      created_at: event.created_at,
      base_entity_id: get_tag_value(event, BASE_ENTITY_ID_TAG) || null,
      supersedes_issue_id: supersedes ? supersedes[1] : null,
      is_hidden: !stewards.has(event.pubkey) && !trusted.has(event.pubkey),
      latest_activity_at: event.created_at
    })
  }

  const touch = (task, event) => {
    if (event.created_at > task.latest_activity_at) {
      task.latest_activity_at = event.created_at
    }
  }

  const statuses = new Map()
  const labels = new Map()
  const claims = new Map()
  const comment_counts = new Map()

  for (const event of live_events) {
    if (TASK_STATUS_BY_KIND[event.kind]) {
      const task = tasks.get(get_root_issue_id(event))
      if (!task) continue
      if (!stewards.has(event.pubkey) && event.pubkey !== task.pubkey) continue
      keep_newest(statuses, task.id, event)
      touch(task, event)
    } else if (event.kind === TASK_BOARD_KINDS.label) {
      if (!stewards.has(event.pubkey)) continue
      const namespace = get_tag_value(event, 'L')
      const allowed = TASK_LABEL_VALUES[namespace]
      if (!allowed) continue
      const label = event.tags.find(
        (tag) =>
          tag[0] === 'l' && tag[2] === namespace && allowed.includes(tag[1])
      )
      if (!label) continue
      for (const issue_id of get_tag_values(event, 'e')) {
        const task = tasks.get(issue_id)
        if (!task) continue
        keep_newest(labels, `${issue_id}:${namespace}`, event)
        touch(task, event)
      }
    } else if (event.kind === TASK_BOARD_KINDS.claim) {
      const task = tasks.get(get_tag_value(event, 'd'))
      if (!task || get_tag_value(event, 'a') !== board_address) continue
      keep_newest(claims, `${event.pubkey}:${task.id}`, event)
      touch(task, event)
    } else if (event.kind === TASK_BOARD_KINDS.comment) {
      const task = tasks.get(get_tag_value(event, 'E'))
      if (!task) continue
      comment_counts.set(task.id, (comment_counts.get(task.id) || 0) + 1)
      touch(task, event)
    }
  }

  const get_label = (issue_id, namespace) => {
    const event = labels.get(`${issue_id}:${namespace}`)
    if (!event) return null
    return event.tags.find((tag) => tag[0] === 'l' && tag[2] === namespace)[1]
  }

  const task_claims = new Map()
  for (const event of claims.values()) {
    const issue_id = get_tag_value(event, 'd')
    // A claim lapses at its expiration, capped at the claim lifetime after
    // signing; a claim without one lapses at the cap.
    const max_expiration = event.created_at + CLAIM_LIFETIME_SECONDS
    const expiration = Math.min(
      Number(get_tag_value(event, 'expiration')) || max_expiration,
      max_expiration
    )
    const status = get_tag_value(event, 'status')
    const claim = {
      pubkey: event.pubkey,
      status,
      created_at: event.created_at,
      expiration,
      is_active: status === 'active' && expiration > now
    }
    if (!task_claims.has(issue_id)) task_claims.set(issue_id, [])
    task_claims.get(issue_id).push(claim)
  }

  const columns = Object.fromEntries(TASK_BOARD_COLUMNS.map((c) => [c, []]))
  for (const task of tasks.values()) {
    const status_event = statuses.get(task.id)
    task.status = status_event ? TASK_STATUS_BY_KIND[status_event.kind] : 'open'
    task.priority = get_label(task.id, TASK_PRIORITY_NAMESPACE)
    task.state = get_label(task.id, TASK_STATE_NAMESPACE)
    task.claims = (task_claims.get(task.id) || []).sort(
      (a, b) => b.created_at - a.created_at
    )
    task.active_claimants = task.claims
      .filter((claim) => claim.is_active)
      .map((claim) => claim.pubkey)
    task.comment_count = comment_counts.get(task.id) || 0
    task.column = get_task_column(task)
    if (!task.is_hidden) columns[task.column].push(task)
  }

  for (const column of Object.values(columns)) column.sort(compare_tasks)

  return {
    board_address,
    announcement,
    stewards: [...stewards],
    trusted: [...trusted],
    tasks: Object.fromEntries(tasks),
    columns: Object.fromEntries(
      Object.entries(columns).map(([name, list]) => [
        name,
        list.map((t) => t.id)
      ])
    )
  }
}
