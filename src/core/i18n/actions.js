export const i18nActions = {
  CHANGE_LOCALE: 'CHANGE_LOCALE',

  change_locale: (locale) => ({
    type: i18nActions.CHANGE_LOCALE,
    payload: {
      locale
    }
  })
}
