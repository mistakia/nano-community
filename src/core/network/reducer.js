import { Map } from 'immutable'
import BigNumber from 'bignumber.js'

import { networkActions } from './actions'
import { accountsActions } from '@core/accounts'
import { average } from '@core/utils'

export function networkReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case networkActions.GET_NETWORK_STATS_FULFILLED: {
      const { data } = payload
      const backlogMedianPr = data.blockCountMedian_pr - data.cementedMedian_pr

      return state.set('stats', {
        ...data,
        backlogMedianPr
      })
    }

    case accountsActions.GET_REPRESENTATIVES_FULFILLED: {
      const { data } = payload
      const dayAgo = Math.round(Date.now() / 1000) - 60 * 60 * 24
      const watts = data.map((d) => d.watt_hour).filter((d) => Boolean(d))
      const totalReps = data.filter(
        (d) => d.representative && d.last_seen > dayAgo
      )
      return state.merge({
        averageWattHour: average(watts),
        totalReps: totalReps.length
      })
    }

    case networkActions.GET_WEIGHT_FULFILLED: {
      const onlineWeight = BigNumber(payload.data.onlineWeight.median || 0)
      const trendedWeight = BigNumber(payload.data.trendedWeight.median || 0)
      const quorumTotal = BigNumber.max(onlineWeight, trendedWeight).toNumber()

      return state.merge({
        weight: {
          ...payload.data,
          quorumTotal
        }
      })
    }

    case networkActions.GET_WEIGHT_HISTORY_FULFILLED:
      return state.merge({
        weightHistory: payload.data
      })

    default:
      return state
  }
}
