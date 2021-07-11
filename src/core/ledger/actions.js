export const ledgerActions = {
  GET_DAILY: 'GET_DAILY',

  GET_DAILY_FAILED: 'GET_DAILY_FAILED',
  GET_DAILY_PENDING: 'GET_DAILY_PENDING',
  GET_DAILY_FULFILLED: 'GET_DAILY_FULFILLED',

  getDaily: () => ({
    type: ledgerActions.GET_DAILY
  }),

  getDailyPending: (params) => ({
    type: ledgerActions.GET_DAILY_PENDING,
    payload: {
      params
    }
  }),

  getDailyFulfilled: (params, data) => ({
    type: ledgerActions.GET_DAILY_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getDailyFailed: (params, error) => ({
    type: ledgerActions.GET_DAILY_FAILED,
    payload: {
      params,
      error
    }
  })
}

export const dailyRequestActions = {
  failed: ledgerActions.getDailyFailed,
  pending: ledgerActions.getDailyPending,
  fulfilled: ledgerActions.getDailyFulfilled
}
