export const docActions = {
  GET_DOC: 'GET_DOC',

  GET_DOC_FAILED: 'GET_DOC_FAILED',
  GET_DOC_PENDING: 'GET_DOC_PENDING',
  GET_DOC_FULFILLED: 'GET_DOC_FULFILLED',

  GET_DOC_COMMIT_FAILED: 'GET_DOC_COMMIT_FAILED',
  GET_DOC_COMMIT_PENDING: 'GET_DOC_COMMIT_PENDING',
  GET_DOC_COMMIT_FULFILLED: 'GET_DOC_COMMIT_FULFILLED',

  GET_LABEL_DOC: 'GET_LABEL_DOC',

  GET_LABEL_DOC_FAILED: 'GET_LABEL_DOC_FAILED',
  GET_LABEL_DOC_PENDING: 'GET_LABEL_DOC_PENDING',
  GET_LABEL_DOC_FULFILLED: 'GET_LABEL_DOC_FULFILLED',

  GET_LABEL_DOC_COMMIT_FAILED: 'GET_LABEL_DOC_COMMIT_FAILED',
  GET_LABEL_DOC_COMMIT_PENDING: 'GET_LABEL_DOC_COMMIT_PENDING',
  GET_LABEL_DOC_COMMIT_FULFILLED: 'GET_LABEL_DOC_COMMIT_FULFILLED',

  getDoc: ({ id, locale = 'en' }) => ({
    type: docActions.GET_DOC,
    payload: {
      id,
      locale
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
  }),

  getLabelDoc: (id) => ({
    type: docActions.GET_LABEL_DOC,
    payload: {
      id
    }
  }),

  getLabelDocPending: (params) => ({
    type: docActions.GET_LABEL_DOC_PENDING,
    payload: {
      params
    }
  }),

  getLabelDocFailed: (params, error) => ({
    type: docActions.GET_LABEL_DOC_FAILED,
    payload: {
      params,
      error
    }
  }),

  getLabelDocFulfilled: (params, data) => ({
    type: docActions.GET_LABEL_DOC_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getLabelDocCommitPending: (params) => ({
    type: docActions.GET_LABEL_DOC_COMMIT_PENDING,
    payload: {
      params
    }
  }),

  getLabelDocCommitFailed: (params, error) => ({
    type: docActions.GET_LABEL_DOC_COMMIT_FAILED,
    payload: {
      params,
      error
    }
  }),

  getLabelDocCommitFulfilled: (params, data) => ({
    type: docActions.GET_LABEL_DOC_COMMIT_FULFILLED,
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

export const labelDocRequestActions = {
  failed: docActions.getLabelDocFailed,
  pending: docActions.getLabelDocPending,
  fulfilled: docActions.getLabelDocFulfilled
}

export const docCommitRequestActions = {
  failed: docActions.getDocCommitFailed,
  pending: docActions.getDocCommitPending,
  fulfilled: docActions.getDocCommitFulfilled
}

export const labelDocCommitRequestActions = {
  failed: docActions.getLabelDocCommitFailed,
  pending: docActions.getLabelDocCommitPending,
  fulfilled: docActions.getLabelDocCommitFulfilled
}
