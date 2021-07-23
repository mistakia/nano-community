import { Map } from 'immutable'

import { Block } from './block'
import { blocksActions } from './actions'

export function blocksReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case blocksActions.GET_BLOCK_FULFILLED:
      return state.set(
        payload.params,
        new Block({ isLoading: false, ...payload.data })
      )

    default:
      return state
  }
}
