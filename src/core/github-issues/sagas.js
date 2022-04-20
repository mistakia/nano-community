import { takeEvery, fork, call } from 'redux-saga/effects'

import { getGithubIssues } from '@core/api'
import { githubIssuesActions } from './actions'

export function* load({ payload }) {
  yield call(getGithubIssues, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetGithubIssues() {
  yield takeEvery(githubIssuesActions.GET_GITHUB_ISSUES, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const githubIssuesSagas = [fork(watchGetGithubIssues)]
