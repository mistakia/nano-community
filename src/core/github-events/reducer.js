import { List } from 'immutable'

import { githubEventsActions } from './actions'

export function githubEventsReducer(state = new List(), { payload, type }) {
  switch (type) {
    case githubEventsActions.GET_GITHUB_EVENTS_FULFILLED: {
      const { data } = payload
      return new List(data)
    }

    default:
      return state
  }
}
