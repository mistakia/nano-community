import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { accountsActions, getAccounts } from '@core/accounts'

import MetricCard from './metric-card'

const mapStateToProps = createSelector(getAccounts, (accountsState) => ({
  selectedField: accountsState.get('field'),
  selectedLabel: accountsState.get('label')
}))

const mapDispatchToProps = {
  filter: accountsActions.filter
}

export default connect(mapStateToProps, mapDispatchToProps)(MetricCard)
