import { createSelector } from 'reselect'

import {
  build_task_board_state,
  TRIAGE_SET_D_TAG
} from '#common/task-board/index.mjs'

export const get_task_board = (state) => state.get('task_board')

const get_events = (state) => state.getIn(['task_board', 'events'])
const get_board = (state) => state.getIn(['task_board', 'board'])

// Recomputed when events arrive. `now` is taken at derivation time so claim
// expiry is evaluated against the clock, not a stale snapshot.
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
// every other kind.
export const get_task_comments = (state, issue_id) => {
  const events = Array.from(get_events(state).values())
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
        event.tags.some((tag) => tag[0] === 'E' && tag[1] === issue_id)
    )
    .sort((a, b) => a.created_at - b.created_at)
}

// The pubkeys in this steward's own latest triage follow set.
export const get_own_triage_set = (state, pubkey) => {
  let latest = null
  for (const event of get_events(state).values()) {
    if (
      event.kind === 30000 &&
      event.pubkey === pubkey &&
      event.tags.some((tag) => tag[0] === 'd' && tag[1] === TRIAGE_SET_D_TAG) &&
      (!latest || event.created_at > latest.created_at)
    ) {
      latest = event
    }
  }
  return latest
    ? latest.tags.filter((tag) => tag[0] === 'p').map((tag) => tag[1])
    : []
}

// The profile name a pubkey published in kind 0, or null.
export const get_profile_name = (state, pubkey) =>
  state.getIn(['task_board', 'profiles', pubkey])?.name || null
