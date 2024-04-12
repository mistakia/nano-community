import { takeEvery, fork, call, select } from 'redux-saga/effects'

import {
  get_blocks_confirmed_summary,
  get_accounts_unconfirmed_summary,
  get_blocks_unconfirmed_summary,
  get_request_history,
  get_price_history
} from '@core/api'
import { nanodb_actions } from './actions'

export function* load_block_confirmed_summary({ payload }) {
  const request_history = yield select(get_request_history)

  if (request_history.has(`GET_BLOCKS_CONFIRMED_SUMMARY_${payload.period}`)) {
    return
  }

  yield call(get_blocks_confirmed_summary, payload)
}

export function* load_accounts_unconfirmed_summary() {
  const request_history = yield select(get_request_history)
  if (request_history.has('GET_ACCOUNTS_UNCONFIRMED_SUMMARY')) {
    return
  }
  yield call(get_accounts_unconfirmed_summary)
}

export function* load_blocks_unconfirmed_summary() {
  const request_history = yield select(get_request_history)
  if (request_history.has('GET_BLOCKS_UNCONFIRMED_SUMMARY')) {
    return
  }
  yield call(get_blocks_unconfirmed_summary)
}

export function* load_price_history() {
  const request_history = yield select(get_request_history)
  if (request_history.has('GET_PRICE_HISTORY')) {
    return
  }
  yield call(get_price_history)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watch_get_blocks_confirmed_summary() {
  yield takeEvery(
    nanodb_actions.GET_BLOCKS_CONFIRMED_SUMMARY,
    load_block_confirmed_summary
  )
}

export function* watch_get_accounts_unconfirmed_summary() {
  yield takeEvery(
    nanodb_actions.GET_ACCOUNTS_UNCONFIRMED_SUMMARY,
    load_accounts_unconfirmed_summary
  )
}

export function* watch_get_blocks_unconfirmed_summary() {
  yield takeEvery(
    nanodb_actions.GET_BLOCKS_UNCONFIRMED_SUMMARY,
    load_blocks_unconfirmed_summary
  )
}

export function* watch_get_price_history() {
  yield takeEvery(nanodb_actions.GET_PRICE_HISTORY, load_price_history)
}

//= ====================================
//  ROOT
// -------------------------------------

export const nanodb_sagas = [
  fork(watch_get_blocks_confirmed_summary),
  fork(watch_get_accounts_unconfirmed_summary),
  fork(watch_get_blocks_unconfirmed_summary),
  fork(watch_get_price_history)
]
