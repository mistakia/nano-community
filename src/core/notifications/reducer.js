import { Record } from 'immutable'

import { notificationActions } from './actions'

const NotificationState = new Record({
  message: null,
  severity: null,
  key: null
})

export function notificationReducer(
  state = new NotificationState(),
  { payload, type }
) {
  switch (type) {
    case notificationActions.SHOW_NOTIFICATION:
      return state.merge({ key: new Date().getTime(), ...payload })

    default:
      return state
  }
}
