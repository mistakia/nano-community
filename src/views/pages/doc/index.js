import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'

import DocPage from './doc'

const mapStateToProps = createSelector(getDocById, (doc) => ({ doc }))

const mapDispatchToProps = {
  getDoc: docActions.getDoc
}

export default connect(mapStateToProps, mapDispatchToProps)(DocPage)
