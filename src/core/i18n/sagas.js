import { takeLatest, put, fork } from 'redux-saga/effects'
import i18n from 'i18next'

import { localStorageAdapter } from '@core/utils'
import { appActions } from '@core/app/actions'
import { SUPPORTED_LOCALES } from '@core/constants'
import { i18nActions } from './actions'

export function* init({ payload }) {
  if (payload.locale) {
    yield put(
      i18nActions.change_locale({ locale: payload.locale, save: false })
    )
  }

  console.log('No locale saved')

  // detect user locale
  const user_locale = navigator.language || navigator.languages[0]

  if (user_locale) {
    const user_locale_key = user_locale.split('-')[0]
    if (SUPPORTED_LOCALES.includes(user_locale_key)) {
      console.log(`Setting locale to browser preference: ${user_locale_key}`)
      yield put(
        i18nActions.change_locale({ locale: user_locale_key, save: false })
      )
    }
  }
}

export function ChangeLocale({ payload }) {
  if (payload.save) {
    localStorageAdapter.setItem('locale', payload.locale)
  }
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
