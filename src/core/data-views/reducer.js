import Immutable, { Map } from 'immutable'

import { data_views_actions } from './actions'
import { default_data_views } from './default-data-views'
import { data_view_request_actions } from '@core/data-view-request/actions'

export function data_views_reducer(
  state = new Map(
    Immutable.fromJS(default_data_views).map((view) =>
      view.set('saved_table_state', view.get('table_state'))
    )
  ),
  { payload, type }
) {
  switch (type) {
    case data_views_actions.DATA_VIEW_CHANGED: {
      const { data_view } = payload
      return state.mergeIn([data_view.view_id], {
        ...data_view,
        table_state: data_view.table_state
      })
    }

    case data_view_request_actions.DATA_VIEW_REQUEST:
      return state.setIn([payload.view_id, 'is_fetching'], true)

    case data_view_request_actions.DATA_VIEW_RESULT:
    case data_view_request_actions.DATA_VIEW_ERROR:
      return state.setIn([payload.request_id, 'is_fetching'], false)

    default:
      return state
  }
}
