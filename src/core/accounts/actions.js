export const accountsActions = {
  GET_REPRESENTATIVES: 'GET_REPRESENTATIVES',

  GET_REPRESENTATIVES_FAILED: 'GET_REPRESENTATIVES_FAILED',
  GET_REPRESENTATIVES_PENDING: 'GET_REPRESENTATIVES_PENDING',
  GET_REPRESENTATIVES_FULFILLED: 'GET_REPRESENTATIVES_FULFILLED',

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
  })
}

export const representativesRequestActions = {
  failed: accountsActions.getRepresentativesFailed,
  pending: accountsActions.getRepresentativesPending,
  fulfilled: accountsActions.getRepresentativesFulfilled
}
