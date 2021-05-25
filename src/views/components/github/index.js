import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getGithub } from '@core/github'

import Github from './github'

const mapStateToProps = createSelector(getGithub, (events) => ({ events }))

export default connect(mapStateToProps)(Github)
