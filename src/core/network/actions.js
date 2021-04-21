export const networkActions = {
  GET_NETWORK_STATS: 'GET_NETWORK_STATS',

  GET_NETWORK_STATS_FAILED: 'GET_NETWORK_STATS_FAILED',
  GET_NETWORK_STATS_PENDING: 'GET_NETWORK_STATS_PENDING',
  GET_NETWORK_STATS_FULFILLED: 'GET_NETWORK_STATS_FULFILLED',

  getNetworkStatsFailed: (params, error) => ({
    type: networkActions.GET_NETWORK_STATS_FAILED,
    payload: {
      params,
      error
    }
  }),

  getNetworkStatsPending: (params) => ({
    type: networkActions.GET_NETWORK_STATS_PENDING,
    payload: {
      params
    }
  }),

  getNetworkStatsFulfilled: (params, data) => ({
    type: networkActions.GET_NETWORK_STATS_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getNetworkStats: () => ({
    type: networkActions.GET_NETWORK_STATS
  })
}

export const networkStatsRequestActions = {
  failed: networkActions.getNetworkStatsFailed,
  pending: networkActions.getNetworkStatsPending,
  fulfilled: networkActions.getNetworkStatsFulfilled
}
