import { fork, call, takeLatest } from 'redux-saga/effects'

import { getDaily } from '@core/api'
import { ledgerActions } from './actions'

export function* loadDaily() {
  yield call(getDaily)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetDaily() {
  yield takeLatest(ledgerActions.GET_DAILY, loadDaily)
}

//= ====================================
//  ROOT
// -------------------------------------

export const ledgerSagas = [fork(watchGetDaily)]
