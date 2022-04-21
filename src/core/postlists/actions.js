export const postlistActions = {
  GET_POSTS: 'GET_POSTS',

  GET_POSTS_FAILED: 'GET_POSTS_FAILED',
  GET_POSTS_PENDING: 'GET_POSTS_PENDING',
  GET_POSTS_FULFILLED: 'GET_POSTS_FULFILLED',

  getPostsFailed: (params, error) => ({
    type: postlistActions.GET_POSTS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getPostsPending: (params) => ({
    type: postlistActions.GET_POSTS_PENDING,
    payload: {
      params
    }
  }),

  getPostsFulfilled: (params, data) => ({
    type: postlistActions.GET_POSTS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getPosts: (id, { age, label }) => ({
    type: postlistActions.GET_POSTS,
    payload: {
      id,
      age,
      label
    }
  })
}

export const postlistRequestActions = {
  failed: postlistActions.getPostsFailed,
  pending: postlistActions.getPostsPending,
  fulfilled: postlistActions.getPostsFulfilled
}
