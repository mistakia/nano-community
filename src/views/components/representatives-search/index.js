import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getAccounts, accountsActions } from '@core/accounts'

import RepresentativesSearch from './representatives-search'

const mapStateToProps = createSelector(getAccounts, (accountsState) => ({
  value: accountsState.get('search')
}))

const mapDispatchToProps = {
  search: accountsActions.search
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RepresentativesSearch)
