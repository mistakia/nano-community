import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { notificationActions, getNotificationInfo } from '@core/notifications'

import Notification from './notification'

const mapStateToProps = createSelector(getNotificationInfo, (info) => ({
  info
}))

const mapDispatchToProps = {
  clear: notificationActions.clear
}

export default connect(mapStateToProps, mapDispatchToProps)(Notification)
