import { Map } from 'immutable'

import { TASK_BOARD_KINDS } from '#common/task-board/index.mjs'

import { task_board_actions } from './actions'

const MAX_NAME_LENGTH = 40

// A kind 0 profile's display name, or null when it has none or is malformed.
const parse_profile_name = (content) => {
  try {
    const profile = JSON.parse(content)
    const name = profile.display_name || profile.name
    return typeof name === 'string' && name.trim()
      ? name.trim().slice(0, MAX_NAME_LENGTH)
      : null
  } catch {
    return null
  }
}

const add_events = (state, events) =>
  state.withMutations((mutable) => {
    for (const event of events) {
      if (event.kind !== TASK_BOARD_KINDS.profile) {
        mutable.setIn(['events', event.id], event)
        continue
      }
      const previous = mutable.getIn(['profiles', event.pubkey])
      if (previous && previous.created_at >= event.created_at) continue
      mutable.setIn(['profiles', event.pubkey], {
        created_at: event.created_at,
        name: parse_profile_name(event.content)
      })
    }
  })

const initial_state = new Map({
  board: null,
  relays: [],
  events: new Map(),
  profiles: new Map(), // pubkey -> { created_at, name }
  is_loaded: false,
  relay_errors: new Map(),
  publishing: new Map() // key -> { pending, error }
})

export function task_board_reducer(state = initial_state, { payload, type }) {
  switch (type) {
    case task_board_actions.TASK_BOARD_INIT:
      return initial_state.merge({
        board: payload.board,
        relays: payload.relays
      })

    case task_board_actions.TASK_BOARD_EVENTS_RECEIVED:
      return add_events(state, payload.events)

    case task_board_actions.TASK_BOARD_LOADED:
      return state.set('is_loaded', true)

    case task_board_actions.TASK_BOARD_RELAY_ERROR:
      return state.setIn(['relay_errors', payload.relay], payload.error)

    case task_board_actions.TASK_BOARD_PUBLISH_PENDING:
      return state.setIn(['publishing', payload.key], { pending: true })

    case task_board_actions.TASK_BOARD_PUBLISH_FULFILLED:
      return state
        .setIn(['publishing', payload.key], { pending: false })
        .setIn(['events', payload.event.id], payload.event)

    case task_board_actions.TASK_BOARD_PUBLISH_FAILED:
      return state.setIn(['publishing', payload.key], {
        pending: false,
        error: payload.error
      })

    default:
      return state
  }
}
