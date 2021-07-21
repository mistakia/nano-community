import BigNumber from 'bignumber.js'
import { getAccountItems } from '@core/accounts'

export function getNetwork(state) {
  return state.get('network')
}

export function getNetworkWattHour(state) {
  const network = getNetwork(state)
  const accounts = getAccountItems(state)

  const peers = network.getIn(['stats', 'peers'], [])
  const prs = peers.filter((p) => p.PR)
  let sum = 0
  for (const pr of prs) {
    sum += accounts.getIn(
      [pr.nanoNodeAccount, 'watt_hour'],
      network.get('averageWattHour')
    )
  }

  return sum
}

export function getNetworkStats(state) {
  const network = getNetwork(state)
  const quorumTotal = BigNumber(network.getIn(['weight', 'quorumTotal'], 0))
    .shiftedBy(-30)
    .toNumber()
  const onlineWeight = BigNumber(
    network.getIn(['weight', 'onlineWeight', 'median'], 0)
  )
    .shiftedBy(-30)
    .toNumber()
  const trendedWeight = BigNumber(
    network.getIn(['weight', 'trendedWeight', 'median'], 0)
  )
    .shiftedBy(-30)
    .toNumber()

  const stats = network.get('stats', {})
  const prs = network
    .getIn(['stats', 'peers'], [])
    .filter((p) => p.PR)
    .sort((a, b) => b.weight - a.weight)

  const confirmLimit = quorumTotal * 0.67
  const censorLimit =
    quorumTotal * 0.33 - Math.max(0, trendedWeight - onlineWeight)

  let sum = 0
  let c = 0
  let i = 0
  for (; c < prs.length && sum < confirmLimit; c++) {
    if (sum < censorLimit) {
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
