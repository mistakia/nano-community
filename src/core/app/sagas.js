import { takeLatest, fork, select } from 'redux-saga/effects'

import { getApp } from './selectors'
import { appActions } from './actions'

export function* init() {
  const { token, key } = yield select(getApp)
  if (token && key) {
    // yield call(fetchAuth)
  }
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchInitApp() {
  yield takeLatest(appActions.INIT_APP, init)
}

//= ====================================
//  ROOT
// -------------------------------------

export const appSagas = [fork(watchInitApp)]
