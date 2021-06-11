import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesCementedMax,
  getRepresentativesTotalWeight
} from '@core/accounts'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesCementedMax,
  getRepresentativesTotalWeight,
  (accounts, cementedMax, totalWeight) => ({
    accounts,
    cementedMax,
    totalWeight
  })
)

export default connect(mapStateToProps)(Representatives)
