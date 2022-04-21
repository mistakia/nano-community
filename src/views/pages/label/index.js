import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'

import LabelPage from './label'

const mapStateToProps = createSelector(getDocById, (doc) => ({ doc }))

const mapDispatchToProps = {
  getLabelDoc: docActions.getLabelDoc
}

export default connect(mapStateToProps, mapDispatchToProps)(LabelPage)
