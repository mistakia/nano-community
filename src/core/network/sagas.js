import { takeEvery, fork, call } from 'redux-saga/effects'

import { getNetworkStats } from '@core/api'
import { networkActions } from './actions'

export function* load({ payload }) {
  yield call(getNetworkStats, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetNetworkStats() {
  yield takeEvery(networkActions.GET_NETWORK_STATS, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const networkSagas = [fork(watchGetNetworkStats)]
