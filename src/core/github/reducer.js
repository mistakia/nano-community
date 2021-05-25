import { List } from 'immutable'

import { githubActions } from './actions'

export function githubReducer(state = new List(), { payload, type }) {
  switch (type) {
    case githubActions.GET_GITHUB_EVENTS_FULFILLED: {
      const { data } = payload
      return new List(data)
    }

    default:
      return state
  }
}
