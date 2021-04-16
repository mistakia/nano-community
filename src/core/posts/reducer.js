import { Map } from 'immutable'

import { postlistActions } from '@core/postlists'
import { Post } from './post'

export function postsReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case postlistActions.GET_POSTS_FULFILLED:
      return state.withMutations((posts) => {
        payload.data.forEach((postData) => {
          posts.set(postData.id, new Post(postData))
        })
      })

    default:
      return state
  }
}
