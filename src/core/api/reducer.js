import { Map } from 'immutable'

import { nanodb_actions } from '@core/nanodb/actions'
import { accountsActions } from '@core/accounts/actions'

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

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_PENDING:
      return state.setIn(
        [
          'request_history',
          `GET_ACCOUNT_BALANCE_HISTORY_${payload.params.account}`
        ],
        true
      )

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FAILED:
      return state.deleteIn([
        'request_history',
        `GET_ACCOUNT_BALANCE_HISTORY_${payload.params.account}`
      ])

    case nanodb_actions.GET_PRICE_HISTORY_PENDING:
      return state.setIn(['request_history', 'GET_PRICE_HISTORY'], true)

    case nanodb_actions.GET_PRICE_HISTORY_FAILED:
      return state.deleteIn(['request_history', 'GET_PRICE_HISTORY'])

    case accountsActions.GET_ACCOUNT_STATS_PENDING:
      return state.setIn(
        ['request_history', `GET_ACCOUNT_STATS_${payload.params.account}`],
        true
      )

    case accountsActions.GET_ACCOUNT_STATS_FAILED:
      return state.deleteIn([
        'request_history',
        `GET_ACCOUNT_STATS_${payload.params.account}`
      ])

    default:
      return state
  }
}
