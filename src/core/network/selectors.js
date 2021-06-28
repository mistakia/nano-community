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
