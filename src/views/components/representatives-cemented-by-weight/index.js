import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesCementedByWeight from './representatives-cemented-by-weight'

const mapStateToProps = createSelector(
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight,
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
        label: '101 to 1,000',
        threshold: 1000,
        filter: {
          between: [101, 1000]
        }
      },
      {
        label: '1,001 to 10,000',
        threshold: 10000,
        filter: {
          between: [1001, 10000]
        }
      },
      {
        label: '10,000+',
        filter: {
          between: [10001, Infinity]
        },
        threshold: null
      }
    ]
    const metrics = thresholds.map((p) => ({ ...p, total: 0 }))
    for (const rep of accounts.valueSeq()) {
      const rep_weight = rep.getIn(['account_meta', 'weight'])
      if (!rep_weight) continue

      const blocks_behind = rep.getIn(['telemetry', 'cemented_behind'])
      if (blocks_behind == null) {
        metrics[0].total = BigNumber(rep_weight)
          .plus(metrics[0].total)
          .toFixed()
        continue
      }

      // stop before the last one (catch-all)
      const last_idx = Math.max(metrics.length - 1, 0)
      let i = 1
      for (; i < last_idx; i++) {
        if (blocks_behind <= metrics[i].threshold) {
          metrics[i].total = BigNumber(rep_weight)
            .plus(metrics[i].total)
            .toFixed()
          break
        }
      }

      // add to catch all
      if (i === last_idx) {
        metrics[i].total = BigNumber(rep_weight)
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

export default connect(mapStateToProps)(RepresentativesCementedByWeight)
