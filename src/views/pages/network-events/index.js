import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  network_events_actions,
  get_network_events_state
} from '@core/network-events'

import NetworkEventsPage from './network-events'

const map_state_to_props = createSelector(
  get_network_events_state,
  (network_events_state) => ({
    network_events: network_events_state.get('network_events').toJS(),
    is_loading: network_events_state.get('is_loading'),
    error: network_events_state.get('error')
  })
)

const map_dispatch_to_props = {
  get_network_events: network_events_actions.get_network_events
}

export default connect(
  map_state_to_props,
  map_dispatch_to_props
)(NetworkEventsPage)
