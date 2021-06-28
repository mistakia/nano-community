import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesCheckedByWeight from './representatives-checked-by-weight'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const thresholds = [
      {
        label: 'Unknown',
        threshold: null,
        filter: {
          empty: true
        }
      },
      {
        label: '0 to 10',
        threshold: 10,
        filter: {
          between: [0, 10]
        }
      },
      {
        label: '11 to 100',
        threshold: 100,
        filter: {
          between: [11, 100]
        }
      },
      {
        label: '101 to 1000',
        threshold: 1000,
        filter: {
          between: [101, 1000]
        }
      },
      {
        label: '1001 to 10000',
        threshold: 10000,
        filter: {
          between: [1001, 10000]
        }
      },
      {
        label: '10000+',
        threshold: null,
        filter: {
          between: [10001, Infinity]
        }
      }
    ]
    const metrics = thresholds.map((p) => ({ ...p, total: 0 }))
    for (const rep of accounts.valueSeq()) {
      if (!rep.account_meta.weight) continue

      const blocksBehind = rep.telemetry.block_behind
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
