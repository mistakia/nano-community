import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesVersionByWeight from './representatives-version-by-weight'

const mapStateToProps = createSelector(
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const metrics = []
    const versions = {}

    for (const rep of accounts.valueSeq()) {
      if (!rep.account_meta.weight) continue

      const version = rep.version
      versions[version] = BigNumber(rep.account_meta.weight)
        .plus(versions[version] || 0)
        .toFixed()
    }

    for (const [version, weight] of Object.entries(versions)) {
      metrics.push({
        label: version,
        filter: {
          match: version
        },
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

export default connect(mapStateToProps)(RepresentativesVersionByWeight)
