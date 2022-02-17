import { Map, List } from 'immutable'

import { githubIssuesActions } from './actions'
import { createGithubIssue } from './github-issue'

const initialState = new Map({
  isPending: false,
  issues: new List()
})

export function githubIssuesReducer(state = initialState, { payload, type }) {
  switch (type) {
    case githubIssuesActions.GET_GITHUB_ISSUES_PENDING:
      return state.set('isPending', true)

    case githubIssuesActions.GET_GITHUB_ISSUES_FAILED:
      return state.set('isPending', false)

    case githubIssuesActions.GET_GITHUB_ISSUES_FULFILLED: {
      let issues = new List()
      payload.data.forEach((issueData) => {
        issues = issues.push(createGithubIssue(issueData))
      })
      return state.merge({
        issues,
        isPending: false
      })
    }

    default:
      return state
  }
}
