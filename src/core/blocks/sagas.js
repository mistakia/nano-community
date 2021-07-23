import { fork, call, takeLatest } from 'redux-saga/effects'

import { getBlock } from '@core/api'
import { blocksActions } from './actions'

export function* loadBlock({ payload }) {
  const { hash } = payload
  yield call(getBlock, hash)
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watchGetBlock() {
  yield takeLatest(blocksActions.GET_BLOCK, loadBlock)
}

//= ====================================
//  ROOT
// -------------------------------------

export const blockSagas = [fork(watchGetBlock)]
