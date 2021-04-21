import { Map } from 'immutable'

import { networkActions } from './actions'

export function networkReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case networkActions.GET_NETWORK_STATS_FULFILLED: {
      const { data } = payload
      // eslint-disable-next-line camelcase
      const backlogMedian_pr = data.blockCountMedian_pr - data.cementedMedian_pr
      return state.set('stats', { ...data, backlogMedian_pr })
    }

    default:
      return state
  }
}
