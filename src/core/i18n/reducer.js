import { Record } from 'immutable'

import { i18nActions } from './actions'

const initialState = new Record({
  locale: 'en'
})

export function i18nReducer(state = initialState(), { payload, type }) {
  switch (type) {
    case i18nActions.CHANGE_LOCALE:
      return state.set('locale', payload.locale)

    default:
      return state
  }
}
