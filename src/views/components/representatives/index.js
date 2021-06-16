import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight
} from '@core/accounts'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight,
  (accounts, checkedMax, totalWeight) => ({
    accounts,
    checkedMax,
    totalWeight
  })
)

export default connect(mapStateToProps)(Representatives)
