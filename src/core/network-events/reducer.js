import { List, Map } from 'immutable'

import { network_events_actions } from './actions'

const initial_state = new Map({
  network_events: new List(),
  params: null,
  is_loading: false,
  error: null
})

// Holds the page for the most recent request only; a response for older
// params (a filter changed while it was in flight) is dropped.
const is_current_request = (state, params) =>
  JSON.stringify(state.get('params')) === JSON.stringify(params)

export function network_events_reducer(
  state = initial_state,
  { payload, type }
) {
  switch (type) {
    case network_events_actions.GET_NETWORK_EVENTS_PENDING:
      return state.merge({
        params: payload.params,
        is_loading: true,
        error: null
      })

    case network_events_actions.GET_NETWORK_EVENTS_FULFILLED:
      if (!is_current_request(state, payload.params)) return state
      return state.merge({
        network_events: new List(payload.data),
        is_loading: false
      })

    case network_events_actions.GET_NETWORK_EVENTS_FAILED:
      if (!is_current_request(state, payload.params)) return state
      return state.merge({
        network_events: new List(),
        is_loading: false,
        error: payload.error
      })

    default:
      return state
  }
}
