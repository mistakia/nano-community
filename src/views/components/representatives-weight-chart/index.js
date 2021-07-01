import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'
import { getNetwork } from '@core/network'

import RepresentativesWeightChart from './representatives-weight-chart'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  getNetwork,
  (accounts, totalWeight, network) => ({
    accounts,
    totalWeight,
    quorumTotal: network.getIn(['weight', 'quorumTotal'], 0)
  })
)

export default connect(mapStateToProps)(RepresentativesWeightChart)
