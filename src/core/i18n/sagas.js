import { takeLatest, put, fork } from 'redux-saga/effects'
import i18n from 'i18next'

import { localStorageAdapter } from '@core/utils'
import { appActions } from '@core/app/actions'
import { i18nActions } from './actions'

export function* init({ payload }) {
  if (payload.locale) {
    yield put(i18nActions.change_locale(payload.locale))
  }

  // TODO detect user locale
}

export function ChangeLocale({ payload }) {
  localStorageAdapter.setItem('locale', payload.locale)
  i18n.changeLanguage(payload.locale)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchInitApp() {
  yield takeLatest(appActions.INIT_APP, init)
}

export function* watchChangeLocale() {
  yield takeLatest(i18nActions.CHANGE_LOCALE, ChangeLocale)
}

//= ====================================
//  ROOT
// -------------------------------------

export const i18nSagas = [fork(watchInitApp), fork(watchChangeLocale)]
