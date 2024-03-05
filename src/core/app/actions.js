export const appActions = {
  INIT_APP: 'INIT_APP',

  init: ({ token, key, locale }) => ({
    type: appActions.INIT_APP,
    payload: {
      token,
      key,
      locale
    }
  })
}
