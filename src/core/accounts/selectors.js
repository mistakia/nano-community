import BigNumber from 'bignumber.js'

import { fuzzySearch } from '@core/utils'

import { Account } from './account'

export function getAccounts(state) {
  return state.get('accounts')
}

export function getAccountItems(state) {
  return state.get('accounts').get('items')
}

export function getAccountById(state, props) {
  const { address } = props.match.params
  const accounts = getAccountItems(state)
  return accounts.get(`nano_${address}`, new Account())
}

export function getFilteredRepresentatives(state) {
  const aState = state.get('accounts')
  let reps = getRepresentatives(state)

  const search = aState.get('search')

  if (search) {
    reps = reps.filter(
      (r) =>
        fuzzySearch(search, r.account || '') ||
        fuzzySearch(search, r.alias || '') ||
        (r.telemetry.address || '').includes(search)
    )
  }

  // no field to filter by
  const field = aState.get('field')
  if (!field) {
    return reps
  }

  const filter = aState.get('value')
  const keyPath = field.split('.')

  return reps.filter((r) => {
    const value = r.getIn(keyPath)

    if (filter.empty && (typeof value === 'undefined' || value == null)) {
      return true
    }

    if (
      filter.between &&
      value >= filter.between[0] &&
      value <= filter.between[1]
    ) {
      return true
    }

    if (typeof filter.match !== 'undefined' && value === filter.match) {
      return true
    }

    return false
  })
}

export function getRepresentatives(state) {
  return state
    .get('accounts')
    .get('items')
    .valueSeq()
    .filter((a) => a.representative)
    .toList()
}

export function getOnlineRepresentatives(state) {
  const reps = getRepresentatives(state)
  return reps.filter((r) => r.is_online)
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

export function getOnlineRepresentativesTotalWeight(state) {
  const accounts = getRepresentatives(state)
  let weight = BigNumber(0)
  for (const rep of accounts.valueSeq()) {
    if (!rep.account_meta.weight) continue
    weight = BigNumber(rep.account_meta.weight).plus(weight)
  }

  return weight.toNumber()
}
