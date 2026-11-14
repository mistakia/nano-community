import { connect } from 'react-redux'

import { accountsActions } from '@core/accounts/actions'

import RepresentativeDelegationHistory from './representative-delegation-history'

const map_dispatch_to_props = {
  get_account_delegation_history: accountsActions.get_account_delegation_history
}

export default connect(
  null,
  map_dispatch_to_props
)(RepresentativeDelegationHistory)
