import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesVersionByWeight from './representatives-version-by-weight'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const metrics = []
    const versions = {
      unknown: 0
    }

    for (const rep of accounts.valueSeq()) {
      if (!rep.account_meta.weight) continue

      /* eslint-disable camelcase */
      const {
        major_version,
        minor_version,
        patch_version,
        pre_release_version
      } = rep.telemetry

      const version = `${major_version}.${minor_version}.${patch_version}.${pre_release_version}`
      if (!major_version) {
        versions.unknown = BigNumber(rep.account_meta.weight)
          .plus(versions.unknown)
          .toFixed()
        continue
      }
      /* eslint-enable camelcase */

      versions[version] = BigNumber(rep.account_meta.weight)
        .plus(versions[version] || 0)
        .toFixed()
    }

    for (const [version, weight] of Object.entries(versions)) {
      metrics.push({
        label: version,
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
