import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesClusterCharts from './representatives-cluster-charts'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  (accounts, totalWeight) => ({ accounts, totalWeight })
)

export default connect(mapStateToProps)(RepresentativesClusterCharts)
