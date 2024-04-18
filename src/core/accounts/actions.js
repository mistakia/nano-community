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

  GET_ACCOUNT_STATS: 'GET_ACCOUNT_STATS',
  GET_ACCOUNT_STATS_FAILED: 'GET_ACCOUNT_STATS_FAILED',
  GET_ACCOUNT_STATS_PENDING: 'GET_ACCOUNT_STATS_PENDING',
  GET_ACCOUNT_STATS_FULFILLED: 'GET_ACCOUNT_STATS_FULFILLED',

  GET_ACCOUNT_OPEN_FAILED: 'GET_ACCOUNT_OPEN_FAILED',
  GET_ACCOUNT_OPEN_PENDING: 'GET_ACCOUNT_OPEN_PENDING',
  GET_ACCOUNT_OPEN_FULFILLED: 'GET_ACCOUNT_OPEN_FULFILLED',

  GET_ACCOUNT_BLOCKS_SUMMARY_FAILED: 'GET_ACCOUNT_BLOCKS_SUMMARY_FAILED',
  GET_ACCOUNT_BLOCKS_SUMMARY_PENDING: 'GET_ACCOUNT_BLOCKS_SUMMARY_PENDING',
  GET_ACCOUNT_BLOCKS_SUMMARY_FULFILLED: 'GET_ACCOUNT_BLOCKS_SUMMARY_FULFILLED',

  GET_ACCOUNT_BALANCE_HISTORY: 'GET_ACCOUNT_BALANCE_HISTORY',
  GET_ACCOUNT_BALANCE_HISTORY_FAILED: 'GET_ACCOUNT_BALANCE_HISTORY_FAILED',
  GET_ACCOUNT_BALANCE_HISTORY_PENDING: 'GET_ACCOUNT_BALANCE_HISTORY_PENDING',
  GET_ACCOUNT_BALANCE_HISTORY_FULFILLED:
    'GET_ACCOUNT_BALANCE_HISTORY_FULFILLED',

  GET_ACCOUNT_BLOCKS_PER_DAY: 'GET_ACCOUNT_BLOCKS_PER_DAY',
  GET_ACCOUNT_BLOCKS_PER_DAY_FAILED: 'GET_ACCOUNT_BLOCKS_PER_DAY_FAILED',
  GET_ACCOUNT_BLOCKS_PER_DAY_PENDING: 'GET_ACCOUNT_BLOCKS_PER_DAY_PENDING',
  GET_ACCOUNT_BLOCKS_PER_DAY_FULFILLED: 'GET_ACCOUNT_BLOCKS_PER_DAY_FULFILLED',

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
  }),

  getAccountBlocksSummaryFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_FAILED,
    payload: {
      params,
      error
    }
  }),

  getAccountBlocksSummaryPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_PENDING,
    payload: {
      params
    }
  }),

  getAccountBlocksSummaryFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_SUMMARY_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getAccountBalanceHistory: (account) => ({
    type: accountsActions.GET_ACCOUNT_BALANCE_HISTORY,
    payload: {
      account
    }
  }),

  getAccountBalanceHistoryFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FAILED,
    payload: {
      params,
      error
    }
  }),

  getAccountBalanceHistoryPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_BALANCE_HISTORY_PENDING,
    payload: {
      params
    }
  }),

  getAccountBalanceHistoryFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_BALANCE_HISTORY_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getAccountStats: (account) => ({
    type: accountsActions.GET_ACCOUNT_STATS,
    payload: {
      account
    }
  }),

  getAccountStatsFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_STATS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getAccountStatsPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_STATS_PENDING,
    payload: {
      params
    }
  }),

  getAccountStatsFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_STATS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  get_account_blocks_per_day: (account) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY,
    payload: {
      account
    }
  }),

  getAccountBlocksPerDayFailed: (params, error) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY_FAILED,
    payload: {
      params,
      error
    }
  }),

  getAccountBlocksPerDayPending: (params) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY_PENDING,
    payload: {
      params
    }
  }),

  getAccountBlocksPerDayFulfilled: (params, data) => ({
    type: accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY_FULFILLED,
    payload: {
      params,
      data
    }
  })
}

export const accountBlocksSummaryRequestActions = {
  failed: accountsActions.getAccountBlocksSummaryFailed,
  pending: accountsActions.getAccountBlocksSummaryPending,
  fulfilled: accountsActions.getAccountBlocksSummaryFulfilled
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

export const accountBalanceHistoryRequestActions = {
  failed: accountsActions.getAccountBalanceHistoryFailed,
  pending: accountsActions.getAccountBalanceHistoryPending,
  fulfilled: accountsActions.getAccountBalanceHistoryFulfilled
}

export const accountStatsRequestActions = {
  failed: accountsActions.getAccountStatsFailed,
  pending: accountsActions.getAccountStatsPending,
  fulfilled: accountsActions.getAccountStatsFulfilled
}

export const accountBlocksPerDayRequestActions = {
  failed: accountsActions.getAccountBlocksPerDayFailed,
  pending: accountsActions.getAccountBlocksPerDayPending,
  fulfilled: accountsActions.getAccountBlocksPerDayFulfilled
}
