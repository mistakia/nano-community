export const githubEventsActions = {
  GET_GITHUB_EVENTS: 'GET_GITHUB_EVENTS',

  GET_GITHUB_EVENTS_FAILED: 'GET_GITHUB_EVENTS_FAILED',
  GET_GITHUB_EVENTS_PENDING: 'GET_GITHUB_EVENTS_PENDING',
  GET_GITHUB_EVENTS_FULFILLED: 'GET_GITHUB_EVENTS_FULFILLED',

  getGithubEventsFailed: (params, error) => ({
    type: githubEventsActions.GET_GITHUB_EVENTS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getGithubEventsPending: (params) => ({
    type: githubEventsActions.GET_GITHUB_EVENTS_PENDING,
    payload: {
      params
    }
  }),

  getGithubEventsFulfilled: (params, data) => ({
    type: githubEventsActions.GET_GITHUB_EVENTS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getGithubEvents: () => ({
    type: githubEventsActions.GET_GITHUB_EVENTS
  })
}

export const githubEventsRequestActions = {
  failed: githubEventsActions.getGithubEventsFailed,
  pending: githubEventsActions.getGithubEventsPending,
  fulfilled: githubEventsActions.getGithubEventsFulfilled
}
