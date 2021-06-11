import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getRepresentatives } from '@core/accounts'

import RepresentativesProviderByWeight from './representatives-provider-by-weight'

const mapStateToProps = createSelector(getRepresentatives, (accounts) => {
  const metrics = []
  let onlineStake = 0
  const providers = {
    unknown: 0
  }

  for (const rep of accounts.valueSeq()) {
    if (!rep.telemetry.weight) continue

    onlineStake = BigNumber(rep.telemetry.weight).plus(onlineStake)

    const provider = rep.meta.provider
    if (!provider) {
      providers.unknown = BigNumber(rep.telemetry.weight)
        .plus(providers.unknown)
        .toFixed()
      continue
    }

    providers[provider] = BigNumber(rep.telemetry.weight)
      .plus(providers[provider] || 0)
      .toFixed()
  }

  for (const [provider, weight] of Object.entries(providers)) {
    metrics.push({
      label: provider,
      value: BigNumber(weight)
        .dividedBy(onlineStake)
        .multipliedBy(100)
        .toFixed(2)
    })
  }

  const filtered = metrics.sort((a, b) => b.value - a.value).slice(0, 6)

  return { metrics: filtered }
})

export default connect(mapStateToProps)(RepresentativesProviderByWeight)
