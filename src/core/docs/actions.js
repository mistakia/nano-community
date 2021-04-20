export const docActions = {
  GET_DOC: 'GET_DOC',

  GET_DOC_FAILED: 'GET_DOC_FAILED',
  GET_DOC_PENDING: 'GET_DOC_PENDING',
  GET_DOC_FULFILLED: 'GET_DOC_FULFILLED',

  GET_DOC_COMMIT_FAILED: 'GET_DOC_COMMIT_FAILED',
  GET_DOC_COMMIT_PENDING: 'GET_DOC_COMMIT_PENDING',
  GET_DOC_COMMIT_FULFILLED: 'GET_DOC_COMMIT_FULFILLED',

  getDoc: (id) => ({
    type: docActions.GET_DOC,
    payload: {
      id
    }
  }),

  getDocPending: (params) => ({
    type: docActions.GET_DOC_PENDING,
    payload: {
      params
    }
  }),

  getDocFailed: (params, error) => ({
    type: docActions.GET_DOC_FAILED,
    payload: {
      params,
      error
    }
  }),

  getDocFulfilled: (params, data) => ({
    type: docActions.GET_DOC_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getDocCommitPending: (params) => ({
    type: docActions.GET_DOC_COMMIT_PENDING,
    payload: {
      params
    }
  }),

  getDocCommitFailed: (params, error) => ({
    type: docActions.GET_DOC_COMMIT_FAILED,
    payload: {
      params,
      error
    }
  }),

  getDocCommitFulfilled: (params, data) => ({
    type: docActions.GET_DOC_COMMIT_FULFILLED,
    payload: {
      params,
      data
    }
  })
}

export const docRequestActions = {
  failed: docActions.getDocFailed,
  pending: docActions.getDocPending,
  fulfilled: docActions.getDocFulfilled
}

export const docCommitRequestActions = {
  failed: docActions.getDocCommitFailed,
  pending: docActions.getDocCommitPending,
  fulfilled: docActions.getDocCommitFulfilled
}
