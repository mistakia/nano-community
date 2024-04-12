import { Map } from 'immutable'

import { nanodb_actions } from './actions'

const initial_state = new Map({
  price_history: []
})

export function nanodb_reducer(state = initial_state, action) {
  switch (action.type) {
    case nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_FULFILLED:
      return state.set(
        `block_confirmed_summary_${action.payload.params.period}`,
        action.payload.data
      )

    case nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FULFILLED:
      return state.set('accounts_unconfirmed_summary', action.payload.data)

    case nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY_FULFILLED:
      return state.set('blocks_unconfirmed_summary', action.payload.data)

    case nanodb_actions.GET_PRICE_HISTORY_FULFILLED:
      return state.set('price_history', action.payload.data)

    default:
      return state
  }
}
