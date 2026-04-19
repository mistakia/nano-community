import { takeLatest, fork, call, select } from 'redux-saga/effects'

import { data_views_actions } from './actions'
import { post_representatives_data_view } from '@core/api'

function get_selected_data_view(state) {
  const data_views = state.get('data_views')
  const selected_id =
    state.getIn(['app', 'selected_data_view_id']) || data_views.keySeq().first()
  return data_views.get(selected_id)
}

function* handle_data_view_request({ data_view }) {
  const table_state = data_view.get
    ? data_view.get('table_state')
    : data_view.table_state

  if (!table_state) {
    return
  }

  const table_state_js =
    table_state && table_state.toJS ? table_state.toJS() : table_state

  const columns = table_state_js.columns
  if (!columns || !columns.length) {
    return
  }

  const view_id = data_view.get ? data_view.get('view_id') : data_view.view_id

  yield call(post_representatives_data_view, {
    table_state: table_state_js,
    view_id
  })
}

export function* data_view_changed({ payload }) {
  const { view_change_params = {} } = payload
  const { view_state_changed } = view_change_params

  if (view_state_changed) {
    const data_view = yield select(get_selected_data_view)
    yield call(handle_data_view_request, { data_view })
  }
}

export function* set_selected_data_view() {
  const data_view = yield select(get_selected_data_view)
  yield call(handle_data_view_request, { data_view })
}

export function* reset_data_view_cache() {
  const data_view = yield select(get_selected_data_view)
  yield call(handle_data_view_request, { data_view })
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watch_data_view_changed() {
  yield takeLatest(data_views_actions.DATA_VIEW_CHANGED, data_view_changed)
}

export function* watch_set_selected_data_view() {
  yield takeLatest(
    data_views_actions.SET_SELECTED_DATA_VIEW,
    set_selected_data_view
  )
}

export function* watch_reset_data_view_cache() {
  yield takeLatest(
    data_views_actions.RESET_DATA_VIEW_CACHE,
    reset_data_view_cache
  )
}

//= ====================================
//  ROOT
// -------------------------------------

export const data_views_sagas = [
  fork(watch_data_view_changed),
  fork(watch_set_selected_data_view),
  fork(watch_reset_data_view_cache)
]
