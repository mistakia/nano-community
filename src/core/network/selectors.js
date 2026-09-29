import BigNumber from 'bignumber.js'
import { getOnlineRepresentatives } from '@core/accounts'

export function getNetwork(state) {
  return state.get('network')
}

export function get_principal_representative_minimum_weight(state) {
  const network = getNetwork(state)
  const trended_weight = network.getIn(['weight', 'trendedWeight', 'median'])
  if (!trended_weight) {
    return null
  }
  return BigInt(trended_weight) / BigInt(1000)
}

// online representatives holding at least the principal representative
// minimum weight, sorted by weight descending
export function get_online_principal_representatives(state) {
  const minimum_weight = get_principal_representative_minimum_weight(state)
  if (minimum_weight === null) {
    return null
  }

  return getOnlineRepresentatives(state)
    .filter((rep) =>
      BigNumber(rep.getIn(['account_meta', 'weight'], 0)).gte(
        minimum_weight.toString()
      )
    )
    .sortBy((rep) => -rep.getIn(['account_meta', 'weight'], 0))
}

export function getNetworkWattHour(state) {
  const network = getNetwork(state)
  const prs = get_online_principal_representatives(state)
  if (!prs || prs.size === 0) {
    return 0
  }

  const average_watt_hour = network.get('averageWattHour') || 0
  return prs.reduce(
    (sum, rep) => sum + (rep.get('watt_hour') || average_watt_hour),
    0
  )
}

export function getNetworkStats(state) {
  const network = getNetwork(state)
  const prs = get_online_principal_representatives(state)
  const online_reps = getOnlineRepresentatives(state)

  const peer_counts = online_reps
    .map((rep) => rep.getIn(['telemetry', 'peer_count']))
    .filter(Boolean)
  const peers_max = peer_counts.size ? peer_counts.max() : null

  const online_weight_raw = network.getIn(['weight', 'onlineWeight', 'median'])
  const online_weight_nano = online_weight_raw
    ? BigNumber(online_weight_raw).shiftedBy(-30).toNumber()
    : null

  if (!prs || prs.size === 0) {
    return {
      prCount: null,
      censorReps: null,
      confirmReps: null,
      peers_max,
      online_weight_nano
    }
  }

  const quorum_total = BigNumber(network.getIn(['weight', 'quorumTotal'], 0))
  const online_weight = BigNumber(online_weight_raw || 0)
  const trended_weight = BigNumber(
    network.getIn(['weight', 'trendedWeight', 'median'], 0)
  )

  const confirm_limit = quorum_total.times(0.67)
  const censor_limit = quorum_total
    .times(0.33)
    .minus(BigNumber.max(0, trended_weight.minus(online_weight)))

  // count the fewest principal representatives whose combined weight
  // reaches each limit
  let sum = BigNumber(0)
  let confirm_reps = null
  let censor_reps = null
  let count = 0
  for (const rep of prs) {
    sum = sum.plus(rep.getIn(['account_meta', 'weight'], 0))
    count += 1
    if (censor_reps === null && sum.gte(censor_limit)) censor_reps = count
    if (confirm_reps === null && sum.gte(confirm_limit)) confirm_reps = count
  }

  return {
    prCount: prs.size,
    censorReps: censor_reps,
    confirmReps: confirm_reps,
    peers_max,
    online_weight_nano
  }
}
