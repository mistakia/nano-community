import { takeEvery, takeLatest, fork, call } from 'redux-saga/effects'

import { getNetworkStats, getWeight, getWeightHistory } from '@core/api'
import { networkActions } from './actions'

export function* load({ payload }) {
  yield call(getNetworkStats, payload)
}

export function* loadWeight() {
  yield call(getWeight)
}

export function* loadWeightHistory() {
  yield call(getWeightHistory)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetNetworkStats() {
  yield takeEvery(networkActions.GET_NETWORK_STATS, load)
}

export function* watchGetWeight() {
  yield takeLatest(networkActions.GET_WEIGHT, loadWeight)
}

export function* watchGetWeightHistory() {
  yield takeLatest(networkActions.GET_WEIGHT_HISTORY, loadWeightHistory)
}

//= ====================================
//  ROOT
// -------------------------------------

export const networkSagas = [
  fork(watchGetNetworkStats),
  fork(watchGetWeight),
  fork(watchGetWeightHistory)
]
