import { Map } from 'immutable'

import { accountsActions } from './actions'
import { createAccount } from './account'

const initialState = new Map({
  isLoading: false,
  field: null,
  value: null,
  label: null,
  search: null,
  items: new Map()
})

export function accountsReducer(state = initialState, { payload, type }) {
  switch (type) {
    case accountsActions.GET_REPRESENTATIVES_PENDING:
      return state.set('isLoading', true)

    case accountsActions.GET_REPRESENTATIVES_FAILED:
      return state.set('isLoading', false)

    case accountsActions.GET_REPRESENTATIVES_FULFILLED:
      return state.withMutations((accounts) => {
        accounts.set('isLoading', false)
        payload.data.forEach((accountData) => {
          // do not overwrite GET_REPRESENTATIVE_FULFILLED
          const account = accounts.getIn(['items', accountData.account])
          if (!account) {
            accounts.setIn(
              ['items', accountData.account],
              createAccount(accountData)
            )
          }
        })
      })

    case accountsActions.FILTER_REPRESENTATIVES: {
      const { field, value, label } = payload
      return state.merge({
        field,
        value,
        label
      })
    }

    case accountsActions.SEARCH_REPRESENTATIVES:
      return state.merge({
        search: payload.value
      })

    case accountsActions.GET_ACCOUNT_FULFILLED:
      return state.setIn(['items', payload.params], createAccount(payload.data))

    case accountsActions.GET_ACCOUNT_OPEN_FULFILLED:
      return state.mergeIn(['items', payload.params, 'open'], payload.data)

    case accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_FULFILLED:
      return state.setIn(
        [
          'items',
          payload.params.account,
          'blocks_summary',
          payload.params.type
        ],
        payload.data
      )

    default:
      return state
  }
}
