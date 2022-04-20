export const githubDiscussionsActions = {
  GET_GITHUB_DISCUSSIONS: 'GET_GITHUB_DISCUSSIONS',

  GET_GITHUB_DISCUSSIONS_FAILED: 'GET_GITHUB_DISCUSSIONS_FAILED',
  GET_GITHUB_DISCUSSIONS_PENDING: 'GET_GITHUB_DISCUSSIONS_PENDING',
  GET_GITHUB_DISCUSSIONS_FULFILLED: 'GET_GITHUB_DISCUSSIONS_FULFILLED',

  getGithubDiscussionsFailed: (params, error) => ({
    type: githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getGithubDiscussionsPending: (params) => ({
    type: githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_PENDING,
    payload: {
      params
    }
  }),

  getGithubDiscussionsFulfilled: (params, data) => ({
    type: githubDiscussionsActions.GET_GITHUB_DISCUSSIONS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getGithubDiscussions: () => ({
    type: githubDiscussionsActions.GET_GITHUB_DISCUSSIONS
  })
}

export const githubDiscussionsRequestActions = {
  failed: githubDiscussionsActions.getGithubDiscussionsFailed,
  pending: githubDiscussionsActions.getGithubDiscussionsPending,
  fulfilled: githubDiscussionsActions.getGithubDiscussionsFulfilled
}
