import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { nanodb_actions } from '@core/nanodb/actions'

import LedgerChartDistribution from './ledger-chart-distribution'

const map_state_to_props = createSelector(
  (state) => state.getIn(['nanodb', 'price_history']),
  (price_history) => ({
    price_history
  })
)

const map_dispatch_to_props = {
  get_price_history: nanodb_actions.get_price_history
}

export default connect(map_state_to_props, map_dispatch_to_props)(LedgerChartDistribution)
