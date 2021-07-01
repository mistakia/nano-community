import { Map } from 'immutable'
import BigNumber from 'bignumber.js'

import { networkActions } from './actions'
import { accountsActions } from '@core/accounts'

const average = (arr) => arr.reduce((acc, v) => acc + v) / arr.length

export function networkReducer(state = new Map(), { payload, type }) {
  switch (type) {
    case networkActions.GET_NETWORK_STATS_FULFILLED: {
      const { data } = payload
      // eslint-disable-next-line camelcase
      const backlogMedianPr = data.blockCountMedian_pr - data.cementedMedian_pr
      const prs = data.peers
        .filter((p) => p.PR)
        .sort((a, b) => b.weight - a.weight)
      const confirmLimit = data.pStakeOnline * 0.67
      const censorLimit = data.pStakeOnline * 0.33
      let sum = 0
      let c = 0
      let i = 0
      for (; c < prs.length && sum < confirmLimit; c++) {
        if (sum < censorLimit) {
          i = c
        }
        sum += prs[c].weight
      }

      return state.set('stats', {
        ...data,
        prCount: prs.length,
        censorReps: i + 1,
        confirmReps: c + 1,
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
      const onlineWeight = BigNumber(payload.data.onlineWeight.max || 0)
      const trendedWeight = BigNumber(payload.data.trendedWeight.median || 0)
      const quorumTotal = BigNumber.max(onlineWeight, trendedWeight).toNumber()

      return state.merge({
        weight: {
          ...payload.data,
          quorumTotal
        }
      })
    }

    default:
      return state
  }
}
