import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getNetwork } from '@core/network'

import Network from './network'

const mapStateToProps = createSelector(getNetwork, (network) => ({ network }))

export default connect(mapStateToProps)(Network)
