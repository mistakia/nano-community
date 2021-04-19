import { takeLatest, fork, call } from 'redux-saga/effects'

import { getDoc } from '@core/api'
import { docActions } from './actions'

export function* fetch({ payload }) {
  yield call(getDoc, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetDoc() {
  yield takeLatest(docActions.GET_DOC, fetch)
}

//= ====================================
//  ROOT
// -------------------------------------

export const docSagas = [fork(watchGetDoc)]
