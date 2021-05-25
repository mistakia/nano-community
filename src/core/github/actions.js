export const githubActions = {
  GET_GITHUB_EVENTS: 'GET_GITHUB_EVENTS',

  GET_GITHUB_EVENTS_FAILED: 'GET_GITHUB_EVENTS_FAILED',
  GET_GITHUB_EVENTS_PENDING: 'GET_GITHUB_EVENTS_PENDING',
  GET_GITHUB_EVENTS_FULFILLED: 'GET_GITHUB_EVENTS_FULFILLED',

  getGithubEventsFailed: (params, error) => ({
    type: githubActions.GET_GITHUB_EVENTS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getGithubEventsPending: (params) => ({
    type: githubActions.GET_GITHUB_EVENTS_PENDING,
    payload: {
      params
    }
  }),

  getGithubEventsFulfilled: (params, data) => ({
    type: githubActions.GET_GITHUB_EVENTS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getGithubEvents: () => ({
    type: githubActions.GET_GITHUB_EVENTS
  })
}

export const githubEventsRequestActions = {
  failed: githubActions.getGithubEventsFailed,
  pending: githubActions.getGithubEventsPending,
  fulfilled: githubActions.getGithubEventsFulfilled
}
