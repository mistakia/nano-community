import { Map } from 'immutable'

import { accountsActions } from './actions'
import { Account } from './account'

export function accountsReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case accountsActions.GET_REPRESENTATIVES_FULFILLED:
      return state.withMutations((accounts) => {
        payload.data.forEach((accountData) => {
          accounts.set(accountData.account, new Account(accountData))
        })
      })

    default:
      return state
  }
}
