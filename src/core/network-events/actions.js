export const network_events_actions = {
  GET_NETWORK_EVENTS: 'GET_NETWORK_EVENTS',

  GET_NETWORK_EVENTS_FAILED: 'GET_NETWORK_EVENTS_FAILED',
  GET_NETWORK_EVENTS_PENDING: 'GET_NETWORK_EVENTS_PENDING',
  GET_NETWORK_EVENTS_FULFILLED: 'GET_NETWORK_EVENTS_FULFILLED',

  // params: limit, offset, and the optional network_event_type,
  // representative_account and severity filters
  get_network_events: (params) => ({
    type: network_events_actions.GET_NETWORK_EVENTS,
    payload: {
      params
    }
  }),

  get_network_events_failed: (params, error) => ({
    type: network_events_actions.GET_NETWORK_EVENTS_FAILED,
    payload: {
      params,
      error
    }
  }),

  get_network_events_pending: (params) => ({
    type: network_events_actions.GET_NETWORK_EVENTS_PENDING,
    payload: {
      params
    }
  }),

  get_network_events_fulfilled: (params, data) => ({
    type: network_events_actions.GET_NETWORK_EVENTS_FULFILLED,
    payload: {
      params,
      data
    }
  })
}

export const network_events_request_actions = {
  failed: network_events_actions.get_network_events_failed,
  pending: network_events_actions.get_network_events_pending,
  fulfilled: network_events_actions.get_network_events_fulfilled
}
