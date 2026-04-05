import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'
import { notificationActions } from '@core/notifications'

import DocPage from './doc'

const getRouterLocation = (state, ownProps) => {
  if (ownProps.location) return ownProps
  const router = state.get('router')
  return { location: router.location }
}

const mapStateToProps = createSelector(
  (state, ownProps) => getDocById(state, getRouterLocation(state, ownProps)),
  (state, ownProps) => getRouterLocation(state, ownProps).location,
  (doc, location) => ({ doc, location })
)

const mapDispatchToProps = {
  getDoc: docActions.getDoc,
  showNotification: notificationActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(DocPage)
