import { Map, List } from 'immutable'

import { ledgerActions } from './actions'

const initialState = new Map({
  daily: new List()
})

export function ledgerReducer(state = initialState, { payload, type }) {
  switch (type) {
    case ledgerActions.GET_DAILY_FULFILLED:
      return state.set('daily', new List(payload.data))

    default:
      return state
  }
}
