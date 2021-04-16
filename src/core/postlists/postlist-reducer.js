import { Postlist } from './postlist'
import { postlistActions } from './actions'
import { mergeList } from '@core/utils'

export function postlistReducer(state = new Postlist(), { payload, type }) {
  switch (type) {
    case postlistActions.GET_POSTS_FULFILLED:
      return state.withMutations((postlist) => {
        postlist.merge({
          isPending: false,
          postIds: mergeList(postlist.postIds, payload.data)
        })
      })

    case postlistActions.GET_POSTS_FAILED:
      return state.set('isPending', false)

    default:
      return state
  }
}
