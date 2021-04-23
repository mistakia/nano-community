import { takeLatest, fork, select } from 'redux-saga/effects'
import { LOCATION_CHANGE } from 'connected-react-router'

import { getApp } from './selectors'
import { appActions } from './actions'

export function* init() {
  const { token, key } = yield select(getApp)
  if (token && key) {
    // yield call(fetchAuth)
  }
}

export function reset() {
  window.scrollTo(0, 0)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchInitApp() {
  yield takeLatest(appActions.INIT_APP, init)
}

export function* watchLocationChange() {
  yield takeLatest(LOCATION_CHANGE, reset)
}

//= ====================================
//  ROOT
// -------------------------------------

export const appSagas = [fork(watchInitApp), fork(watchLocationChange)]
