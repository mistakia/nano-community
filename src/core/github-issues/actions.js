export const githubIssuesActions = {
  GET_GITHUB_ISSUES: 'GET_GITHUB_ISSUES',

  GET_GITHUB_ISSUES_FAILED: 'GET_GITHUB_ISSUES_FAILED',
  GET_GITHUB_ISSUES_PENDING: 'GET_GITHUB_ISSUES_PENDING',
  GET_GITHUB_ISSUES_FULFILLED: 'GET_GITHUB_ISSUES_FULFILLED',

  getGithubIssuesFailed: (params, error) => ({
    type: githubIssuesActions.GET_GITHUB_ISSUES_FAILED,
    payload: {
      params,
      error
    }
  }),

  getGithubIssuesPending: (params) => ({
    type: githubIssuesActions.GET_GITHUB_ISSUES_PENDING,
    payload: {
      params
    }
  }),

  getGithubIssuesFulfilled: (params, data) => ({
    type: githubIssuesActions.GET_GITHUB_ISSUES_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getGithubIssues: ({ repos, state, labels }) => ({
    type: githubIssuesActions.GET_GITHUB_ISSUES,
    payload: {
      repos,
      state,
      labels
    }
  })
}

export const githubIssuesRequestActions = {
  failed: githubIssuesActions.getGithubIssuesFailed,
  pending: githubIssuesActions.getGithubIssuesPending,
  fulfilled: githubIssuesActions.getGithubIssuesFulfilled
}
