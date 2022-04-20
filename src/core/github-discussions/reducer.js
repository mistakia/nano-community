import { Map, List } from 'immutable'

import { githubDiscussionsActions } from './actions'
import { createGithubDiscussion } from './github-discussion'

const initialState = new Map({
  isPending: false,
  discussions: new List()
})

export function githubDiscussionsReducer(
  state = initialState,
  { payload, type }
) {
  switch (type) {
    case githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_PENDING:
      return state.set('isPending', true)

    case githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_FAILED:
      return state.set('isPending', false)

    case githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_FULFILLED: {
      let discussions = new List()
      payload.data.forEach((discussionData) => {
        discussions = discussions.push(createGithubDiscussion(discussionData))
      })
      return state.merge({
        discussions,
        isPending: false
      })
    }

    default:
      return state
  }
}
