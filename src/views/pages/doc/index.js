import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'
import { notificationActions } from '@core/notifications'

import DocPage from './doc'

const mapStateToProps = createSelector(getDocById, (doc) => ({ doc }))

const mapDispatchToProps = {
  getDoc: docActions.getDoc,
  showNotification: notificationActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(DocPage)
