export const accountsActions = {
  GET_REPRESENTATIVES: 'GET_REPRESENTATIVES',

  GET_REPRESENTATIVE: 'GET_REPRESENTATIVE',

  GET_REPRESENTATIVES_FAILED: 'GET_REPRESENTATIVES_FAILED',
  GET_REPRESENTATIVES_PENDING: 'GET_REPRESENTATIVES_PENDING',
  GET_REPRESENTATIVES_FULFILLED: 'GET_REPRESENTATIVES_FULFILLED',

  GET_REPRESENTATIVE_FAILED: 'GET_REPRESENTATIVE_FAILED',
  GET_REPRESENTATIVE_PENDING: 'GET_REPRESENTATIVE_PENDING',
  GET_REPRESENTATIVE_FULFILLED: 'GET_REPRESENTATIVE_FULFILLED',

  getRepresentativesFailed: (params, error) => ({
    type: accountsActions.GET_REPRESENTATIVES_FAILED,
    payload: {
      params,
      error
    }
  }),

  getRepresentativesPending: (params) => ({
    type: accountsActions.GET_REPRESENTATIVES_PENDING,
    payload: {
      params
    }
  }),

  getRepresentativesFulfilled: (params, data) => ({
    type: accountsActions.GET_REPRESENTATIVES_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getRepresentatives: () => ({
    type: accountsActions.GET_REPRESENTATIVES
  }),

  getRepresentativeFailed: (params, error) => ({
    type: accountsActions.GET_REPRESENTATIVE_FAILED,
    payload: {
      params,
      error
    }
  }),

  getRepresentativePending: (params) => ({
    type: accountsActions.GET_REPRESENTATIVE_PENDING,
    payload: {
      params
    }
  }),

  getRepresentativeFulfilled: (params, data) => ({
    type: accountsActions.GET_REPRESENTATIVE_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getRepresentative: (account) => ({
    type: accountsActions.GET_REPRESENTATIVE,
    payload: {
      account
    }
  })
}

export const representativesRequestActions = {
  failed: accountsActions.getRepresentativesFailed,
  pending: accountsActions.getRepresentativesPending,
  fulfilled: accountsActions.getRepresentativesFulfilled
}

export const representativeRequestActions = {
  failed: accountsActions.getRepresentativeFailed,
  pending: accountsActions.getRepresentativePending,
  fulfilled: accountsActions.getRepresentativeFulfilled
}
