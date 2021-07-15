export const accountsActions = {
  GET_REPRESENTATIVES: 'GET_REPRESENTATIVES',

  FILTER_REPRESENTATIVES: 'FILTER_REPRESENTATIVES',
  SEARCH_REPRESENTATIVES: 'SEARCH_REPRESENTATIVES',

  GET_REPRESENTATIVES_FAILED: 'GET_REPRESENTATIVES_FAILED',
  GET_REPRESENTATIVES_PENDING: 'GET_REPRESENTATIVES_PENDING',
  GET_REPRESENTATIVES_FULFILLED: 'GET_REPRESENTATIVES_FULFILLED',

  GET_ACCOUNT: 'GET_ACCOUNT',
  GET_ACCOUNT_FAILED: 'GET_ACCOUNT_FAILED',
  GET_ACCOUNT_PENDING: 'GET_ACCOUNT_PENDING',
  GET_ACCOUNT_FULFILLED: 'GET_ACCOUNT_FULFILLED',

  GET_ACCOUNT_OPEN_FAILED: 'GET_ACCOUNT_OPEN_FAILED',
  GET_ACCOUNT_OPEN_PENDING: 'GET_ACCOUNT_OPEN_PENDING',
  GET_ACCOUNT_OPEN_FULFILLED: 'GET_ACCOUNT_OPEN_FULFILLED',

  filter: ({ field, value, label } = {}) => ({
    type: accountsActions.FILTER_REPRESENTATIVES,
    payload: {
      field,
      value,
      label
    }
  }),

  search: (value) => ({
    type: accountsActions.SEARCH_REPRESENTATIVES,
    payload: {
      value
    }
  }),

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

  getAccount: (account) => ({
    type: accountsActions.GET_ACCOUNT,
    payload: {
      account
    }
  }),

  getAccountPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_PENDING,
    payload: {
      params
    }
  }),

  getAccountFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getAccountFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_FAILED,
    payload: {
      params,
      error
    }
  }),

  getAccountOpenPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_OPEN_PENDING,
    payload: {
      params
    }
  }),

  getAccountOpenFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_OPEN_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getAccountOpenFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_OPEN_FAILED,
    payload: {
      params,
      error
    }
  })
}

export const representativesRequestActions = {
  failed: accountsActions.getRepresentativesFailed,
  pending: accountsActions.getRepresentativesPending,
  fulfilled: accountsActions.getRepresentativesFulfilled
}

export const accountRequestActions = {
  failed: accountsActions.getAccountFailed,
  pending: accountsActions.getAccountPending,
  fulfilled: accountsActions.getAccountFulfilled
}

export const accountOpenRequestActions = {
  failed: accountsActions.getAccountOpenFailed,
  pending: accountsActions.getAccountOpenPending,
  fulfilled: accountsActions.getAccountOpenFulfilled
}
