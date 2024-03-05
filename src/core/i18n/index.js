import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'
import HttpBackend from 'i18next-http-backend'

import { SUPPORTED_LOCALES } from '@core/constants'

export { i18nActions } from './actions'
export { i18nReducer } from './reducer'
export { i18nSagas } from './sagas'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    // detection
    debug: true,
    backend: {
      // Configuration options for the backend plugin
      loadPath: '/locales/{{lng}}.json' // Path to the translation files
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES
  })

export default i18n
