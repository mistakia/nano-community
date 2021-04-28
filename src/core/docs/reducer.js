import { Map } from 'immutable'

import { docActions } from './actions'
import { Doc } from './doc'

export function docsReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case docActions.GET_DOC_PENDING:
      return state.set(payload.params.id, new Doc())

    case docActions.GET_DOC_FAILED:
      return state.mergeIn([payload.params.id], {
        isPending: false,
        isLoaded: true
      })

    case docActions.GET_DOC_FULFILLED:
      return state.mergeIn([payload.params.id], {
        isPending: false,
        isLoaded: true,
        content: payload.data
      })

    case docActions.GET_DOC_COMMIT_FULFILLED: {
      const authors = {}
      for (const item of payload.data) {
        authors[item.author.id] = item.author
      }
      const commit = payload.data[0]
      return state.mergeIn([payload.params.id], {
        commit: new Map(commit),
        authors: new Map(authors)
      })
    }

    default:
      return state
  }
}
