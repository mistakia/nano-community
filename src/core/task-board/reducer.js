import { Map } from 'immutable'

import { task_board_actions } from './actions'

const initial_state = new Map({
  board: null,
  relays: [],
  events: new Map(),
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
      return state.update('events', (events) =>
        events.withMutations((map) => {
          for (const event of payload.events) map.set(event.id, event)
        })
      )

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
