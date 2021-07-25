import { Map, List } from 'immutable'

import { ledgerActions } from './actions'

const initialState = new Map({
  isLoading: false,
  daily: new List()
})

export function ledgerReducer(state = initialState, { payload, type }) {
  switch (type) {
    case ledgerActions.GET_DAILY_PENDING:
      return state.set('isLoading', true)

    case ledgerActions.GET_DAILY_FAILED:
      return state.set('isLoading', false)

    case ledgerActions.GET_DAILY_FULFILLED:
      return state.merge({
        isLoading: false,
        daily: new List(payload.data)
      })

    default:
      return state
  }
}
