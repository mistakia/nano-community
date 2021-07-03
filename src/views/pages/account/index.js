import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { accountsActions, getAccountById } from '@core/accounts'

import AccountPage from './account'

const mapStateToProps = createSelector(getAccountById, (account) => ({
  account
}))

const mapDispatchToProps = {
  getAccount: accountsActions.getAccount
}

export default connect(mapStateToProps, mapDispatchToProps)(AccountPage)
