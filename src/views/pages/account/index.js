import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { accountsActions, getAccountById } from '@core/accounts'
import { notificationActions } from '@core/notifications'

import AccountPage from './account'

const mapStateToProps = createSelector(getAccountById, (account) => ({
  account
}))

const mapDispatchToProps = {
  getAccount: accountsActions.getAccount,
  showNotification: notificationActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(AccountPage)
