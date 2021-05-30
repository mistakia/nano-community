import { takeEvery, fork, call } from 'redux-saga/effects'

import { getRepresentatives } from '@core/api'
import { accountsActions } from './actions'

export function* load() {
  yield call(getRepresentatives)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetRepresentatives() {
  yield takeEvery(accountsActions.GET_REPRESENTATIVES, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const accountSagas = [fork(watchGetRepresentatives)]
