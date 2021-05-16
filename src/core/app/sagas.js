/* global gtag */
import { takeLatest, fork, select } from 'redux-saga/effects'
import { LOCATION_CHANGE } from 'connected-react-router'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

import history from '@core/history'
import { getApp } from './selectors'
import { appActions } from './actions'

const fpPromise = FingerprintJS.load()

// cookie-less / anonymous GA reporting
async function pageView() {
  if (!window.gtag) {
    return
  }

  const fp = await fpPromise
  const result = await fp.get()

  gtag('config', 'G-CV3N29BMWR', {
    page_path: history.location.pathname,
    client_storage: 'none',
    anonymize_ip: true,
    client_id: result.visitorId
  })
}

export function* init() {
  const { token, key } = yield select(getApp)
  if (token && key) {
    // yield call(fetchAuth)
  }
}

export function reset() {
  window.scrollTo(0, 0)
  pageView()
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
