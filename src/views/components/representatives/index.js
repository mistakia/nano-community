import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesCementedMax,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight
} from '@core/accounts'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesCementedMax,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight,
  (accounts, cementedMax, checkedMax, totalWeight) => ({
    accounts,
    cementedMax,
    checkedMax,
    totalWeight
  })
)

export default connect(mapStateToProps)(Representatives)
