export const notificationActions = {
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',

  show: ({ message, severity }) => ({
    type: notificationActions.SHOW_NOTIFICATION,
    payload: {
      message,
      severity
    }
  })
}
