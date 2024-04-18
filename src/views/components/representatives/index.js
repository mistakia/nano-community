import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getFilteredRepresentatives,
  getAccounts,
  getRepresentativesTotalWeight
} from '@core/accounts'
import { getNetwork } from '@core/network'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getFilteredRepresentatives,
  getRepresentativesTotalWeight,
  getAccounts,
  getNetwork,
  (accounts, totalWeight, accountsState, network) => ({
    accounts,
    totalWeight,
    representatives_is_loading: accountsState.get('representatives_is_loading'),
    quorumTotal: network.getIn(['weight', 'quorumTotal'], 0)
  })
)

export default connect(mapStateToProps)(Representatives)
