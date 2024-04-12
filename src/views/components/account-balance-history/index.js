import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { accountsActions } from '@core/accounts/actions'
import { nanodb_actions } from '@core/nanodb/actions'

import AccountBalanceHistory from './account-balance-history'

const map_state_to_props = createSelector(
  (state) => state.getIn(['nanodb', 'price_history']),
  (price_history) => ({ price_history })
)

const map_dispatch_to_props = {
  get_account_balance_history: accountsActions.getAccountBalanceHistory,
  get_price_history: nanodb_actions.get_price_history
}

export default connect(
  map_state_to_props,
  map_dispatch_to_props
)(AccountBalanceHistory)
