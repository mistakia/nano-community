import { Map } from 'immutable'

import { nanodb_actions } from './actions'

export function nanodb_reducer(state = Map(), action) {
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

    default:
      return state
  }
}
