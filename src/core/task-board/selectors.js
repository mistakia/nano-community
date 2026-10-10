import { createSelector } from 'reselect'

import {
  build_task_board_state,
  get_event_pow,
  needs_event_pow,
  parse_nano_account_binding,
  TASK_BOARD_KINDS,
  TASK_UNVOUCHED_POW_DIFFICULTY
} from '#common/task-board/index.mjs'

export const get_task_board = (state) => state.get('task_board')

const get_events = (state) => state.getIn(['task_board', 'events'])
const get_board = (state) => state.getIn(['task_board', 'board'])

// Recomputed when events arrive, so claim expiry is evaluated against the
// clock at the latest event, not continuously.
export const get_task_board_state = createSelector(
  get_events,
  get_board,
  (events, board) =>
    board
      ? build_task_board_state({
          events: Array.from(events.values()),
          board
        })
      : null
)

// A comment its author asked to delete is dropped, as the reducer does for
// every other kind, and so is one short of the proof of work its author needs.
export const get_task_comments = (state, issue_id) => {
  const events = Array.from(get_events(state).values())
  const board_state = get_task_board_state(state)
  const counts = (event) =>
    !board_state ||
    !needs_event_pow({
      state: board_state,
      pubkey: event.pubkey,
      kind: event.kind
    }) ||
    get_event_pow(event) >= TASK_UNVOUCHED_POW_DIFFICULTY
  const deleted = new Set()
  for (const event of events) {
    if (event.kind !== 5) continue
    for (const tag of event.tags) {
      if (tag[0] === 'e') deleted.add(`${event.pubkey}:${tag[1]}`)
    }
  }
  return events
    .filter(
      (event) =>
        event.kind === 1111 &&
        !deleted.has(`${event.pubkey}:${event.id}`) &&
        counts(event) &&
        event.tags.some((tag) => tag[0] === 'E' && tag[1] === issue_id)
    )
    .sort((a, b) => a.created_at - b.created_at)
}

// The profile name a pubkey published in kind 0, or null.
export const get_profile_name = (state, pubkey) =>
  state.getIn(['task_board', 'profiles', pubkey])?.name || null

// The raw kind 0 content a pubkey published, so an edit can keep its fields.
export const get_profile_content = (state, pubkey) =>
  state.getIn(['task_board', 'profiles', pubkey])?.content || ''

// Whether the board holds any event from a pubkey. The community relay takes
// a kind 0 only from a key that has one.
export const has_board_activity = (state, pubkey) =>
  state.getIn(['task_board', 'events']).some((event) => event.pubkey === pubkey)

// A key's latest Nano account binding event and what it states, or null.
export const get_nano_binding = (state, pubkey) => {
  const events = [...get_events(state).values()]
  // An unlink is the author's deletion request for the binding.
  const deleted = new Set(
    events
      .filter(
        (event) =>
          event.kind === TASK_BOARD_KINDS.deletion_request &&
          event.pubkey === pubkey
      )
      .flatMap((event) =>
        event.tags.filter((tag) => tag[0] === 'e').map((tag) => tag[1])
      )
  )
  let latest = null
  for (const event of events) {
    if (
      event.kind === TASK_BOARD_KINDS.nano_identity &&
      event.pubkey === pubkey &&
      !deleted.has(event.id) &&
      (!latest || event.created_at > latest.created_at)
    ) {
      latest = event
    }
  }
  return latest
    ? { event: latest, binding: parse_nano_account_binding(latest) }
    : null
}
