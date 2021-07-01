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
    isLoading: accountsState.get('isLoading'),
    quorumTotal: network.getIn(['weight', 'quorumTotal'], 0)
  })
)

export default connect(mapStateToProps)(Representatives)
