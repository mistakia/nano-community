import { List } from 'immutable'

import { Postlist } from './postlist'
import { postlistActions } from './actions'
import { mergeList } from '@core/utils'

export function postlistReducer(state = new Postlist(), { payload, type }) {
  switch (type) {
    case postlistActions.GET_POSTS_PENDING:
      return state.merge({
        isPending: true,
        postIds: new List()
      })

    case postlistActions.GET_POSTS_FULFILLED:
      return state.merge({
        isPending: false,
        postIds: mergeList(state.postIds, payload.data)
      })

    case postlistActions.GET_POSTS_FAILED:
      return state.set('isPending', false)

    default:
      return state
  }
}
