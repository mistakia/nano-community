import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesCementedMax
} from '@core/accounts'

import Representatives from './representatives'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesCementedMax,
  (accounts, cementedMax) => ({ accounts, cementedMax })
)

export default connect(mapStateToProps)(Representatives)
