import { takeEvery, fork, call } from 'redux-saga/effects'

import { getPosts } from '@core/api'
import { postlistActions } from './actions'

export function* load({ payload }) {
  yield call(getPosts, payload)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetPosts() {
  yield takeEvery(postlistActions.GET_POSTS, load)
}

//= ====================================
//  ROOT
// -------------------------------------

export const postlistSagas = [fork(watchGetPosts)]
