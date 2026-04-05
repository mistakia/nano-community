export const data_views_actions = {
  DATA_VIEW_CHANGED: 'DATA_VIEW_CHANGED',
  data_view_changed: (data_view, view_change_params) => ({
    type: data_views_actions.DATA_VIEW_CHANGED,
    payload: { data_view, view_change_params }
  }),

  SET_SELECTED_DATA_VIEW: 'SET_SELECTED_DATA_VIEW',
  set_selected_data_view: (data_view_id) => ({
    type: data_views_actions.SET_SELECTED_DATA_VIEW,
    payload: {
      data_view_id,
      view_change_params: { view_state_changed: true }
    }
  }),

  RESET_DATA_VIEW_CACHE: 'RESET_DATA_VIEW_CACHE',
  reset_data_view_cache: () => ({
    type: data_views_actions.RESET_DATA_VIEW_CACHE
  })
}
