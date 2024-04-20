import { Map, List } from 'immutable'

import { accountsActions } from './actions'
import { createAccount, Account } from './account'

const initial_state = new Map({
  representatives_is_loading: false,
  field: null,
  value: null,
  label: null,
  search: null,
  items: new Map()
})

export function accounts_reducer(state = initial_state, { payload, type }) {
  switch (type) {
    case accountsActions.GET_REPRESENTATIVES_PENDING:
      return state.set('representatives_is_loading', true)

    case accountsActions.GET_REPRESENTATIVES_FAILED:
      return state.set('representatives_is_loading', false)

    case accountsActions.GET_REPRESENTATIVES_FULFILLED:
      return state.withMutations((accounts) => {
        accounts.set('representatives_is_loading', false)
        payload.data.forEach((account_data) => {
          // do not overwrite GET_REPRESENTATIVE_FULFILLED
          const account_key = ['items', account_data.account]
          const existing_account = accounts.getIn(account_key, new Account())
          const updated_account = createAccount({
            ...existing_account.toJS(),
            ...account_data,
            account_is_loaded: true
          })
          accounts.setIn(account_key, updated_account)
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
      return state.withMutations((state) => {
        const account_key = ['items', payload.params]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          ...payload.data,
          account_is_loading: false,
          account_is_loaded: true
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_OPEN_PENDING:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          account_is_loading_open: true
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_OPEN_FULFILLED:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          open: payload.data,
          account_is_loading_open: false
        })
        state.setIn(account_key, updated_account)
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
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          blocks_summary: {
            ...existing_account.blocks_summary,
            [payload.params.type]: payload.data
          },
          [`account_is_loading_blocks_${payload.params.type}_summary`]: false
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_PENDING:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          account_is_loading_balance_history: true
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FAILED:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          account_is_loading_balance_history: false
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FULFILLED:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          balance_history: List(payload.data),
          account_is_loading_balance_history: false
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_STATS_FULFILLED:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          stats: Map(payload.data),
          account_is_loading_stats: false
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY_FULFILLED:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          blocks_per_day: List(payload.data),
          account_is_loading_blocks_per_day: false
        })
        state.setIn(account_key, updated_account)
      })

    case accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY_PENDING:
      return state.withMutations((state) => {
        const account_key = ['items', payload.params.account]
        const existing_account = state.getIn(account_key, new Account())
        const updated_account = createAccount({
          ...existing_account.toJS(),
          account_is_loading_blocks_per_day: true
        })
        state.setIn(account_key, updated_account)
      })

    default:
      return state
  }
}
