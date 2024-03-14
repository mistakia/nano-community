import { Map } from 'immutable'

import { nanodb_actions } from '@core/nanodb/actions'

const initialState = new Map({
  request_history: new Map()
})

export function api_reducer(state = initialState, { payload, type }) {
  switch (type) {
    case nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_PENDING:
      return state.setIn(
        [
          'request_history',
          `GET_BLOCKS_CONFIRMED_SUMMARY_${payload.params.period}`
        ],
        true
      )

    case nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_FAILED:
      return state.deleteIn([
        'request_history',
        `GET_BLOCKS_CONFIRMED_SUMMARY_${payload.params.period}`
      ])

    case nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_PENDING:
      return state.setIn(
        ['request_history', 'GET_ACCOUNTS_UNCONFIRMED_SUMMARY'],
        true
      )

    case nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FAILED:
      return state.deleteIn([
        'request_history',
        'GET_ACCOUNTS_UNCONFIRMED_SUMMARY'
      ])

    default:
      return state
  }
}
