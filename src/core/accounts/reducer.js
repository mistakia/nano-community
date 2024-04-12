import { Map, List } from 'immutable'

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
      return state.setIn(
        ['items', payload.params],
        createAccount({ ...payload.data, account_is_loading: false })
      )

    case accountsActions.GET_ACCOUNT_OPEN_PENDING:
      return state.setIn(
        ['items', payload.params, 'account_is_loading_open'],
        true
      )

    case accountsActions.GET_ACCOUNT_OPEN_FULFILLED:
      return state.withMutations((state) => {
        state.mergeIn(['items', payload.params, 'open'], payload.data)
        state.setIn(['items', payload.params, 'account_is_loading_open'], false)
      })

    case accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_PENDING:
      return state.setIn(
        [
          'items',
          payload.params.account,
          `account_is_loading_blocks_${payload.params.type}_summary`
        ],
        true
      )

    case accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_FULFILLED:
      return state.withMutations((state) => {
        state.setIn(
          [
            'items',
            payload.params.account,
            'blocks_summary',
            payload.params.type
          ],
          payload.data
        )
        state.setIn(
          [
            'items',
            payload.params.account,
            `account_is_loading_blocks_${payload.params.type}_summary`
          ],
          false
        )
      })

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_PENDING:
      return state.setIn(
        ['items', payload.params.account, 'account_is_loading_balance_history'],
        true
      )

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FAILED:
      return state.setIn(
        ['items', payload.params.account, 'account_is_loading_balance_history'],
        false
      )

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FULFILLED:
      return state.withMutations((state) => {
        state.setIn(
          ['items', payload.params.account, 'balance_history'],
          List(payload.data)
        )
        state.setIn(
          [
            'items',
            payload.params.account,
            'account_is_loading_balance_history'
          ],
          false
        )
      })

    default:
      return state
  }
}
