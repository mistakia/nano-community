export const nanodb_actions = {
  GET_BLOCKS_CONFIRMED_SUMMARY: 'GET_BLOCKS_CONFIRMED_SUMMARY',

  GET_BLOCKS_CONFIRMED_SUMMARY_FAILED: 'GET_BLOCKS_CONFIRMED_SUMMARY_FAILED',
  GET_BLOCKS_CONFIRMED_SUMMARY_PENDING: 'GET_BLOCKS_CONFIRMED_SUMMARY_PENDING',
  GET_BLOCKS_CONFIRMED_SUMMARY_FULFILLED:
    'GET_BLOCKS_CONFIRMED_SUMMARY_FULFILLED',

  GET_ACCOUNTS_UNCONFIRMED_SUMMARY: 'GET_ACCOUNTS_UNCONFIRMED_SUMMARY',

  GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FAILED:
    'GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FAILED',
  GET_ACCOUNTS_UNCONFIRMED_SUMMARY_PENDING:
    'GET_ACCOUNTS_UNCONFIRMED_SUMMARY_PENDING',
  GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FULFILLED:
    'GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FULFILLED',

  GET_BLOCKS_UNCONFIRMED_SUMMARY: 'GET_BLOCKS_UNCONFIRMED_SUMMARY',

  GET_BLOCKS_UNCONFIRMED_SUMMARY_FAILED:
    'GET_BLOCKS_UNCONFIRMED_SUMMARY_FAILED',
  GET_BLOCKS_UNCONFIRMED_SUMMARY_PENDING:
    'GET_BLOCKS_UNCONFIRMED_SUMMARY_PENDING',
  GET_BLOCKS_UNCONFIRMED_SUMMARY_FULFILLED:
    'GET_BLOCKS_UNCONFIRMED_SUMMARY_FULFILLED',

  get_blocks_confirmed_summary: (period = '10m') => ({
    type: nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY,
    payload: {
      period
    }
  }),

  get_blocks_confirmed_summary_failed: (params, error) => ({
    type: nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_FAILED,
    payload: {
      params,
      error
    }
  }),

  get_blocks_confirmed_summary_pending: (params) => ({
    type: nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_PENDING,
    payload: {
      params
    }
  }),

  get_blocks_confirmed_summary_fulfilled: (params, data) => ({
    type: nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  get_accounts_unconfirmed_summary: () => ({
    type: nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY
  }),

  get_accounts_unconfirmed_summary_failed: (params, error) => ({
    type: nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FAILED,
    payload: {
      params,
      error
    }
  }),

  get_accounts_unconfirmed_summary_pending: (params) => ({
    type: nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_PENDING,
    payload: {
      params
    }
  }),
  get_accounts_unconfirmed_summary_fulfilled: (params, data) => ({
    type: nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY_FULFILLED,
    payload: {
      params,
      data
    }
  }),

  get_blocks_unconfirmed_summary: () => ({
    type: nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY
  }),

  get_blocks_unconfirmed_summary_failed: (params, error) => ({
    type: nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY_FAILED,
    payload: {
      params,
      error
    }
  }),
  get_blocks_unconfirmed_summary_pending: (params) => ({
    type: nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY_PENDING,
    payload: {
      params
    }
  }),
  get_blocks_unconfirmed_summary_fulfilled: (params, data) => ({
    type: nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY_FULFILLED,
    payload: {
      params,
      data
    }
  })
}

export const block_confirmed_summary_request_actions = {
  failed: nanodb_actions.get_blocks_confirmed_summary_failed,
  fulfilled: nanodb_actions.get_blocks_confirmed_summary_fulfilled,
  pending: nanodb_actions.get_blocks_confirmed_summary_pending
}

export const accounts_unconfirmed_summary_request_actions = {
  failed: nanodb_actions.get_accounts_unconfirmed_summary_failed,
  fulfilled: nanodb_actions.get_accounts_unconfirmed_summary_fulfilled,
  pending: nanodb_actions.get_accounts_unconfirmed_summary_pending
}

export const blocks_unconfirmed_summary_request_actions = {
  failed: nanodb_actions.get_blocks_unconfirmed_summary_failed,
  fulfilled: nanodb_actions.get_blocks_unconfirmed_summary_fulfilled,
  pending: nanodb_actions.get_blocks_unconfirmed_summary_pending
}
