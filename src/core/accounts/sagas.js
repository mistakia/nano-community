import { takeEvery, fork, call, takeLatest, select } from 'redux-saga/effects'

import {
  getRepresentatives,
  getAccount,
  getAccountOpen,
  getAccountBlocksSummary,
  get_account_balance_history,
  get_request_history,
  get_account_stats,
  get_account_blocks_per_day
} from '@core/api'
import { accountsActions } from './actions'

export function* loadReps() {
  yield call(getRepresentatives)
}

export function* loadAccount({ payload }) {
  const { account } = payload
  yield call(getAccount, account)
  yield call(getAccountOpen, account)
  yield fork(getAccountBlocksSummary, { account, type: 'send', limit: 10 })
  // yield fork(getAccountBlocksSummary, { account, type: 'receive', limit: 10 })
  yield fork(getAccountBlocksSummary, { account, type: 'change', limit: 10 })
}

export function* loadAccountBalanceHistory({ payload }) {
  const { account } = payload
  const request_history = yield select(get_request_history)
  if (request_history.has(`GET_ACCOUNT_BALANCE_HISTORY_${account}`)) {
    return
  }
  yield call(get_account_balance_history, { account })
}

export function* loadAccountStats({ payload }) {
  const { account } = payload
  const request_history = yield select(get_request_history)
  if (request_history.has(`GET_ACCOUNT_STATS_${account}`)) {
    return
  }
  yield call(get_account_stats, { account })
}

export function* loadAccountBlocksPerDay({ payload }) {
  const { account } = payload
  const request_history = yield select(get_request_history)
  if (request_history.has(`GET_ACCOUNT_BLOCKS_PER_DAY_${account}`)) {
    return
  }
  yield call(get_account_blocks_per_day, { account })
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetRepresentatives() {
  yield takeEvery(accountsActions.GET_REPRESENTATIVES, loadReps)
}

export function* watchGetAccount() {
  yield takeLatest(accountsActions.GET_ACCOUNT, loadAccount)
}

export function* watchGetAccountBalanceHistory() {
  yield takeLatest(
    accountsActions.GET_ACCOUNT_BALANCE_HISTORY,
    loadAccountBalanceHistory
  )
}

export function* watchGetAccountStats() {
  yield takeLatest(accountsActions.GET_ACCOUNT_STATS, loadAccountStats)
}

export function* watchGetAccountBlocksPerDay() {
  yield takeLatest(
    accountsActions.GET_ACCOUNT_BLOCKS_PER_DAY,
    loadAccountBlocksPerDay
  )
}

//= ====================================
//  ROOT
// -------------------------------------

export const accountSagas = [
  fork(watchGetRepresentatives),
  fork(watchGetAccount),
  fork(watchGetAccountBalanceHistory),
  fork(watchGetAccountStats),
  fork(watchGetAccountBlocksPerDay)
]
