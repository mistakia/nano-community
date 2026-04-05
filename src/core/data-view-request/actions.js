export const data_view_request_actions = {
  DATA_VIEW_REQUEST: 'DATA_VIEW_REQUEST',
  DATA_VIEW_RESULT: 'DATA_VIEW_RESULT',
  DATA_VIEW_ERROR: 'DATA_VIEW_ERROR',

  data_view_request: (payload) => ({
    type: data_view_request_actions.DATA_VIEW_REQUEST,
    payload
  })
}

export const representatives_data_view_request_actions = {
  pending: (opts) => ({
    type: data_view_request_actions.DATA_VIEW_REQUEST,
    payload: { view_id: opts.view_id }
  }),
  fulfilled: (opts, data) => ({
    type: data_view_request_actions.DATA_VIEW_RESULT,
    payload: { request_id: opts.view_id, ...data }
  }),
  failed: (opts, error) => ({
    type: data_view_request_actions.DATA_VIEW_ERROR,
    payload: { request_id: opts.view_id, error }
  })
}
