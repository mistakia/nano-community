export const networkActions = {
  GET_NETWORK_STATS: 'GET_NETWORK_STATS',

  GET_WEIGHT: 'GET_WEIGHT',

  GET_WEIGHT_FAILED: 'GET_WEIGHT_FAILED',
  GET_WEIGHT_PENDING: 'GET_WEIGHT_PENDING',
  GET_WEIGHT_FULFILLED: 'GET_WEIGHT_FULFILLED',

  GET_NETWORK_STATS_FAILED: 'GET_NETWORK_STATS_FAILED',
  GET_NETWORK_STATS_PENDING: 'GET_NETWORK_STATS_PENDING',
  GET_NETWORK_STATS_FULFILLED: 'GET_NETWORK_STATS_FULFILLED',

  getWeight: () => ({
    type: networkActions.GET_WEIGHT
  }),

  getWeightFailed: (params, error) => ({
    type: networkActions.GET_WEIGHT_FAILED,
    payload: {
      params,
      error
    }
  }),

  getWeightPending: (params) => ({
    type: networkActions.GET_WEIGHT_PENDING,
    payload: {
      params
    }
  }),

  getWeightFulfilled: (params, data) => ({
    type: networkActions.GET_WEIGHT_FULFILLED,
    payload: {
      params,
      data
    }
  }),

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

export const weightRequestActions = {
  failed: networkActions.getWeightFailed,
  pending: networkActions.getWeightPending,
  fulfilled: networkActions.getWeightFulfilled
}
