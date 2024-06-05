import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getNetwork,
  get_principal_representative_minimum_weight
} from '@core/network'

import RepresentativesWeight from './representatives-weight'

const mapStateToProps = createSelector(
  getNetwork,
  get_principal_representative_minimum_weight,
  (network, principal_representative_minimum_weight) => ({
    network,
    principal_representative_minimum_weight
  })
)

export default connect(mapStateToProps)(RepresentativesWeight)
