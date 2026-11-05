import { takeLatest, fork, call } from 'redux-saga/effects'

import { get_network_events } from '@core/api'
import { network_events_actions } from './actions'

export function* load({ payload }) {
  yield call(get_network_events, payload.params)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watch_get_network_events() {
  yield takeLatest(network_events_actions.GET_NETWORK_EVENTS, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const network_events_sagas = [fork(watch_get_network_events)]
