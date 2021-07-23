export const blocksActions = {
  GET_BLOCK: 'GET_BLOCK',

  GET_BLOCK_FAILED: 'GET_BLOCK_FAILED',
  GET_BLOCK_PENDING: 'GET_BLOCK_PENDING',
  GET_BLOCK_FULFILLED: 'GET_BLOCK_FULFILLED',

  getBlock: (hash) => ({
    type: blocksActions.GET_BLOCK,
    payload: {
      hash
    }
  }),

  getBlockFailed: (params, error) => ({
    type: blocksActions.GET_BLOCK_FAILED,
    payload: {
      params,
      error
    }
  }),

  getBlockFulfilled: (params, data) => ({
    type: blocksActions.GET_BLOCK_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  getBlockPending: (params) => ({
    type: blocksActions.GET_BLOCK_PENDING,
    payload: {
      params
    }
  })
}

export const blockRequestActions = {
  failed: blocksActions.getBlockFailed,
  fulfilled: blocksActions.getBlockFulfilled,
  pending: blocksActions.getBlockPending
}
