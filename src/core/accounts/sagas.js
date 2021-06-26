import { takeEvery, fork, call } from 'redux-saga/effects'

import { getRepresentatives, getRepresentative } from '@core/api'
import { accountsActions } from './actions'

export function* loadReps() {
  yield call(getRepresentatives)
}

export function* loadRep({ payload }) {
  const { account } = payload
  yield call(getRepresentative, account)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetRepresentatives() {
  yield takeEvery(accountsActions.GET_REPRESENTATIVES, loadReps)
}

export function* watchGetRepresentative() {
  yield takeEvery(accountsActions.GET_REPRESENTATIVE, loadRep)
}

//= ====================================
//  ROOT
// -------------------------------------

export const accountSagas = [
  fork(watchGetRepresentatives),
  fork(watchGetRepresentative)
]
