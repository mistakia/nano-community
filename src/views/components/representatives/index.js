import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getFilteredRepresentatives,
  getAccounts,
  getRepresentativesTotalWeight
} from '@core/accounts'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getFilteredRepresentatives,
  getRepresentativesTotalWeight,
  getAccounts,
  (accounts, totalWeight, accountsState) => ({
    accounts,
    totalWeight,
    isLoading: accountsState.get('isLoading')
  })
)

export default connect(mapStateToProps)(Representatives)
