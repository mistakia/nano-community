import BigNumber from 'bignumber.js'
import { getAccountItems } from '@core/accounts'

export function getNetwork(state) {
  return state.get('network')
}

export function getNetworkWattHour(state) {
  const network = getNetwork(state)
  const accounts = getAccountItems(state)

  const peers = network.getIn(['stats', 'nanobrowse_monitors'], [])
  const prs = peers.filter((p) => p.PR)
  let sum = 0
  const average_watt_hour = network.get('averageWattHour') || 0
  for (const pr of prs) {
    sum +=
      accounts.getIn([pr.nanoNodeAccount, 'watt_hour']) || average_watt_hour
  }

  return sum
}

export function getNetworkStats(state) {
  const network = getNetwork(state)
  const quorum_total = BigNumber(network.getIn(['weight', 'quorumTotal'], 0))
    .shiftedBy(-30)
    .toNumber()
  const online_weight = BigNumber(
    network.getIn(['weight', 'onlineWeight', 'median'], 0)
  )
    .shiftedBy(-30)
    .toNumber()
  const trended_weight = BigNumber(
    network.getIn(['weight', 'trendedWeight', 'median'], 0)
  )
    .shiftedBy(-30)
    .toNumber()

  const stats = network.get('stats', {})
  const prs = network
    .getIn(['stats', 'nanobrowse_monitors'], [])
    .filter((p) => p.PR)
    .sort((a, b) => b.weight - a.weight)

  if (prs.length === 0) {
    return {
      ...stats,
      prCount: 0,
      censorReps: 0,
      confirmReps: 0
    }
  }

  const confirm_limit = quorum_total * 0.67
  const censor_limit =
    quorum_total * 0.33 - Math.max(0, trended_weight - online_weight)

  let sum = 0
  let c = 0
  let i = 0
  for (; c < prs.length && sum < confirm_limit; c++) {
    if (sum < censor_limit) {
      i = c
    }
    sum += prs[c].weight
  }

  return {
    ...stats,
    prCount: prs.length,
    censorReps: i + 1,
    confirmReps: c + 1
  }
}
