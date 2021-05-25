import { takeEvery, fork, call } from 'redux-saga/effects'

import { getGithubEvents } from '@core/api'
import { githubActions } from './actions'

export function* load({ payload }) {
  yield call(getGithubEvents, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetGithubEvents() {
  yield takeEvery(githubActions.GET_GITHUB_EVENTS, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const githubSagas = [fork(watchGetGithubEvents)]
