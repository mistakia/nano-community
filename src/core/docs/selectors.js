import { Doc } from './doc'

import i18n from '@core/i18n'

export function getDocs(state) {
  return state.get('docs')
}

export function getDocById(state, { location }) {
  const locale = i18n.language

  const path = location.pathname
  let id = path.endsWith('/') ? path.slice(0, -1) : path
  if (locale) {
    id = id.replace(`/${locale}`, '')
  }
  return getDocs(state).get(id, new Doc())
}
