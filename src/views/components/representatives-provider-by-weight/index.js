import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesProviderByWeight from './representatives-provider-by-weight'

const mapStateToProps = createSelector(
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const metrics = []
    const providers = {
      unknown: 0
    }

    for (const rep of accounts.valueSeq()) {
      if (!rep.account_meta.weight) continue

      const provider = rep.network.asname
      if (!provider) {
        providers.unknown = BigNumber(rep.account_meta.weight)
          .plus(providers.unknown)
          .toFixed()
        continue
      }

      providers[provider] = BigNumber(rep.account_meta.weight)
        .plus(providers[provider] || 0)
        .toFixed()
    }

    for (const [provider, weight] of Object.entries(providers)) {
      const filter =
        provider === 'unknown'
          ? {
              empty: true
            }
          : {
              match: provider
            }
      metrics.push({
        label: provider,
        filter,
        value: BigNumber(weight)
          .dividedBy(totalWeight)
          .multipliedBy(100)
          .toFixed(2)
      })
    }

    const filtered = metrics.sort((a, b) => b.value - a.value).slice(0, 6)

    return { metrics: filtered }
  }
)

export default connect(mapStateToProps)(RepresentativesProviderByWeight)
