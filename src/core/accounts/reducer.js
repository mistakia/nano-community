import { Map } from 'immutable'

import { accountsActions } from './actions'
import { Account } from './account'

export function accountsReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case accountsActions.GET_REPRESENTATIVES_FULFILLED:
      return state.withMutations((accounts) => {
        payload.data.forEach((accountData) => {
          const account = accounts.get(accountData.account)
          if (!account) {
            accounts.set(accountData.account, new Account(accountData))
          }
        })
      })

    case accountsActions.GET_REPRESENTATIVE_FULFILLED:
      return state.set(payload.params, new Account(payload.data))

    default:
      return state
  }
}
