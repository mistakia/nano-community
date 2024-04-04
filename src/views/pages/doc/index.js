import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'
import { notificationActions } from '@core/notifications'
import { i18nActions } from '@core/i18n'

import DocPage from './doc'

const mapStateToProps = createSelector(getDocById, (doc) => ({ doc }))

const mapDispatchToProps = {
  getDoc: docActions.getDoc,
  showNotification: notificationActions.show,
  change_locale: i18nActions.change_locale
}

export default connect(mapStateToProps, mapDispatchToProps)(DocPage)
