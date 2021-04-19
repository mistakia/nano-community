export const docActions = {
  GET_DOC: 'GET_DOC',

  GET_DOC_FAILED: 'GET_DOC_FAILED',
  GET_DOC_PENDING: 'GET_DOC_PENDING',
  GET_DOC_FULFILLED: 'GET_DOC_FULFILLED',

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
  })
}

export const docRequestActions = {
  failed: docActions.getDocFailed,
  pending: docActions.getDocPending,
  fulfilled: docActions.getDocFulfilled
}
