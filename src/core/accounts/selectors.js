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

export function getRepresentativesCementedMax(state) {
  const accounts = getRepresentatives(state)
  const sortedByCemented = accounts.sort(
    (a, b) =>
      (b.telemetry.cemented_count || 0) - (a.telemetry.cemented_count || 0)
  )
  return sortedByCemented.getIn([0, 'telemetry', 'cemented_count'], 0)
}

export function getRepresentativesCheckedMax(state) {
  const accounts = getRepresentatives(state)
  const sortedByChecked = accounts.sort(
    (a, b) => (b.telemetry.block_count || 0) - (a.telemetry.block_count || 0)
  )
  return sortedByChecked.getIn([0, 'telemetry', 'block_count'], 0)
}
