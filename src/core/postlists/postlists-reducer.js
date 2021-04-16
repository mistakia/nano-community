import { Map } from 'immutable'

import { postlistActions } from './actions'
import { postlistReducer } from './postlist-reducer'

export function postlistsReducer(state = new Map(), action) {
  switch (action.type) {
    case postlistActions.GET_POSTS_FULFILLED:
      return state.set(
        action.payload.params.id,
        postlistReducer(state.get(action.payload.params.id), action)
      )

    default:
      return state
  }
}
