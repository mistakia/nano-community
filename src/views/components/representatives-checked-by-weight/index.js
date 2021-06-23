import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getRepresentatives,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesCheckedByWeight from './representatives-checked-by-weight'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesCheckedMax,
  getRepresentativesTotalWeight,
  (accounts, checkedMax, totalWeight) => {
    const thresholds = [
      {
        label: 'Unknown',
        threshold: null
      },
      {
        label: '0 to 10',
        threshold: 10
      },
      {
        label: '11 to 100',
        threshold: 100
      },
      {
        label: '101 to 1000',
        threshold: 1000
      },
      {
        label: '1001 to 10000',
        threshold: 10000
      },
      {
        label: '10000+',
        threshold: null
      }
    ]
    const metrics = thresholds.map((p) => ({ ...p, total: 0 }))
    for (const rep of accounts.valueSeq()) {
      if (!rep.account_meta.weight) continue

      const blocksBehind = rep.telemetry.block_count
        ? checkedMax - rep.telemetry.block_count
        : null
      if (blocksBehind == null) {
        metrics[0].total = BigNumber(rep.account_meta.weight)
          .plus(metrics[0].total)
          .toFixed()
        continue
      }

      // stop before the last one (catch-all)
      const lastIdx = Math.max(metrics.length - 1, 0)
      let i = 1
      for (; i < lastIdx; i++) {
        if (blocksBehind <= metrics[i].threshold) {
          metrics[i].total = BigNumber(rep.account_meta.weight)
            .plus(metrics[i].total)
            .toFixed()
          break
        }
      }

      // add to catch all
      if (i === lastIdx) {
        metrics[i].total = BigNumber(rep.account_meta.weight)
          .plus(metrics[i].total)
          .toFixed()
      }
    }

    // convert to percentage of online weight
    for (let i = 0; i < metrics.length; i++) {
      metrics[i].value = BigNumber(metrics[i].total)
        .dividedBy(totalWeight)
        .multipliedBy(100)
        .toFixed(2)
    }

    return { metrics }
  }
)

export default connect(mapStateToProps)(RepresentativesCheckedByWeight)
