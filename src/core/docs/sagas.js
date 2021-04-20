import { takeLatest, fork, call, select } from 'redux-saga/effects'

import { getDoc, getDocCommit } from '@core/api'
import { docActions } from './actions'
import { getDocById } from './selectors'

export function* fetch({ payload }) {
  yield call(getDoc, payload)
  const doc = yield select(getDocById, { location: { pathname: payload.id } })
  if (doc.content) {
    yield call(getDocCommit, payload)
  }
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
