import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { accountsActions, getAccountById } from '@core/accounts'

import RepresentativePage from './representative'

const mapStateToProps = createSelector(getAccountById, (account) => ({
  account
}))

const mapDispatchToProps = {
  getRepresentative: accountsActions.getRepresentative
}

export default connect(mapStateToProps, mapDispatchToProps)(RepresentativePage)
