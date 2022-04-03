import { takeEvery, fork, call } from 'redux-saga/effects'

import { getGithubDiscussions } from '@core/api'
import { githubDiscussionsActions } from './actions'

export function* load({ payload }) {
  yield call(getGithubDiscussions, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetGithubDiscussions() {
  yield takeEvery(githubDiscussionsActions.GET_GITHUB_DISCUSSIONS, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const githubDiscussionsSagas = [fork(watchGetGithubDiscussions)]
