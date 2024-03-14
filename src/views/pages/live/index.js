import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { nanodb_actions } from '@core/nanodb'

import LivePage from './live'

const map_state_to_props = createSelector(
  (state) => state.get('nanodb'),
  (nanodb) => ({ nanodb })
)

const map_dispatch_to_props = {
  get_blocks_confirmed_summary: nanodb_actions.get_blocks_confirmed_summary,
  get_accounts_unconfirmed_summary:
    nanodb_actions.get_accounts_unconfirmed_summary,
  get_blocks_unconfirmed_summary: nanodb_actions.get_blocks_unconfirmed_summary
}

export default connect(map_state_to_props, map_dispatch_to_props)(LivePage)
