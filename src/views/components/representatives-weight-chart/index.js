import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesWeightChart from './representatives-weight-chart'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  (accounts, totalWeight) => ({ accounts, totalWeight })
)

export default connect(mapStateToProps)(RepresentativesWeightChart)
