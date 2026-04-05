import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { data_views_actions } from '@core/data-views'
import { default_data_view_view_id } from '@core/data-views/default-data-views'
import { get_representative_fields } from '@core/data-views-fields'
import TelemetryPage from './telemetry'

const all_columns = get_representative_fields()

const get_selected_data_view_id = (state) =>
  state.getIn(['app', 'selected_data_view_id']) || default_data_view_view_id

const mapStateToProps = createSelector(
  (state) => state.get('data_views'),
  (state) => state.get('data_view_request'),
  get_selected_data_view_id,
  (data_views, data_view_request, selected_view_id) => {
    const selected_view = data_views.get(selected_view_id)
    const table_state = selected_view
      ? selected_view.get('table_state')
      : null
    const saved_table_state = selected_view
      ? selected_view.get('saved_table_state')
      : null
    const table_state_js =
      table_state && table_state.toJS ? table_state.toJS() : table_state
    const saved_table_state_js =
      saved_table_state && saved_table_state.toJS
        ? saved_table_state.toJS()
        : saved_table_state
    const result = data_view_request.get('result')
    const data = result && result.toJS ? result.toJS() : result || []
    const status = data_view_request.get('status')
    const metadata = data_view_request.get('metadata')
    const metadata_js = metadata && metadata.toJS ? metadata.toJS() : metadata

    return {
      data,
      all_columns,
      table_state: table_state_js,
      saved_table_state: saved_table_state_js,
      is_loading: status === 'pending' && data.length === 0,
      is_fetching: status === 'pending',
      total_row_count: metadata_js ? metadata_js.total_count || 0 : 0,
      total_rows_fetched: data.length,
      selected_view: selected_view
        ? selected_view.toJS
          ? selected_view.toJS()
          : selected_view
        : null,
      views: data_views.toJS
        ? Object.values(data_views.toJS())
        : []
    }
  }
)

const mapDispatchToProps = {
  data_view_changed: data_views_actions.data_view_changed,
  set_selected_data_view: data_views_actions.set_selected_data_view,
  reset_data_view_cache: data_views_actions.reset_data_view_cache,
  load_data_view: () =>
    data_views_actions.set_selected_data_view(default_data_view_view_id)
}

export default connect(mapStateToProps, mapDispatchToProps)(TelemetryPage)
