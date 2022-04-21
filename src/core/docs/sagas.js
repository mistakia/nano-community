import { takeLatest, fork, call, select } from 'redux-saga/effects'

import { getDoc, getLabelDoc, getDocCommit, getLabelDocCommit } from '@core/api'
import { docActions } from './actions'
import { getDocById } from './selectors'

export function* fetch({ payload }) {
  yield call(getDoc, payload)
  const doc = yield select(getDocById, { location: { pathname: payload.id } })
  if (doc.content) {
    yield call(getDocCommit, payload)
  }
}

export function* fetchLabel({ payload }) {
  yield call(getLabelDoc, payload)
  const doc = yield select(getDocById, { location: { pathname: payload.id } })
  if (doc.content) {
    yield call(getLabelDocCommit, payload)
  }
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetDoc() {
  yield takeLatest(docActions.GET_DOC, fetch)
}

export function* watchGetLabelDoc() {
  yield takeLatest(docActions.GET_LABEL_DOC, fetchLabel)
}

//= ====================================
//  ROOT
// -------------------------------------

export const docSagas = [fork(watchGetDoc), fork(watchGetLabelDoc)]
