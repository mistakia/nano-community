import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getAccounts, accountsActions } from '@core/accounts'

import RepresentativesFilters from './representatives-filters'

const mapStateToProps = createSelector(getAccounts, (accountsState) => ({
  field: accountsState.get('field')
}))

const mapDispatchToProps = {
  filter: accountsActions.filter
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RepresentativesFilters)
