import BigNumber from 'bignumber.js'

export function getAccounts(state) {
  return state.get('accounts')
}

export function getRepresentatives(state) {
  return state
    .get('accounts')
    .valueSeq()
    .filter((a) => a.representative)
    .toList()
}

export function getRepresentativesCheckedMax(state) {
  const accounts = getRepresentatives(state)
  const sortedByChecked = accounts.sort(
    (a, b) => (b.telemetry.block_count || 0) - (a.telemetry.block_count || 0)
  )
  return sortedByChecked.getIn([0, 'telemetry', 'block_count'], 0)
}

export function getRepresentativesTotalWeight(state) {
  const accounts = getRepresentatives(state)
  let weight = BigNumber(0)
  for (const rep of accounts.valueSeq()) {
    if (!rep.account_meta.weight) continue
    weight = BigNumber(rep.account_meta.weight).plus(weight)
  }

  return weight.toNumber()
}
