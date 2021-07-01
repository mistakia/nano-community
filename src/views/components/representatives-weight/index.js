import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork } from '@core/network'

import RepresentativesWeight from './representatives-weight'

const mapStateToProps = createSelector(getNetwork, (network) => ({ network }))

export default connect(mapStateToProps)(RepresentativesWeight)
