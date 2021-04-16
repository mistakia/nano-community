export const appActions = {
  INIT_APP: 'INIT_APP',

  init: ({ token, key }) => ({
    type: appActions.INIT_APP,
    payload: {
      token,
      key
    }
  })
}
