import { createSelector } from 'reselect'

import { build_task_board_state } from '#common/task-board/index.mjs'

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
