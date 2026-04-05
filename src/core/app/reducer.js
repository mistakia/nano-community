import { Record } from 'immutable'

import { data_views_actions } from '@core/data-views/actions'

const initialState = new Record({
  token: null,
  key: null,
  selected_data_view_id: null
})

export function appReducer(state = initialState(), { payload, type }) {
  switch (type) {
    case data_views_actions.SET_SELECTED_DATA_VIEW:
      return state.set('selected_data_view_id', payload.data_view_id)

    default:
      return state
  }
}
