import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesBandwidthByWeight from './representatives-bandwidth-by-weight'

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
        label: 'Unlimited',
        threshold: 0,
        filter: {
          match: 0
        }
      },
      {
        label: '1 mb to 5 mb',
        threshold: 5 * (1024 * 1024),
        filter: {
          between: [1, 5 * (1024 * 1024)]
        }
      },
      {
        label: '6 mb to 10 mb',
        threshold: 10 * (1024 * 1024),
        filter: {
          between: [5 * (1024 * 1024) + 1, 10 * (1024 * 1024)]
        }
      },
      {
        label: '11 mb to 20 mb',
        threshold: 20 * (1024 * 1024),
        filter: {
          between: [10 * (1024 * 1024) + 1, 20 * (1024 * 1024)]
        }
      },
      {
        label: '20 mb to 100 mb',
        threshold: 100 * (1024 * 1024),
        filter: {
          between: [20 * (1024 * 1024) + 1, 100 * (1024 * 1024)]
        }
      },
      {
        label: '101 mb+',
        threshold: null,
        filter: {
          between: [100 * (1024 * 1024) + 1, Infinity]
        }
      }
    ]
    const metrics = thresholds.map((p) => ({ ...p, total: 0 }))
    for (const rep of accounts.valueSeq()) {
      const rep_weight = rep.getIn(['account_meta', 'weight'], 0)
      if (!rep_weight) continue

      // add to unknown
      if (rep.getIn(['telemetry', 'bandwidth_cap']) === undefined) {
        metrics[0].total = BigNumber(rep_weight)
          .plus(metrics[0].total)
          .toFixed()
        continue
      }

      // add to unlimited
      if (rep.getIn(['telemetry', 'bandwidth_cap']) === 0) {
        metrics[1].total = BigNumber(rep_weight)
          .plus(metrics[1].total)
          .toFixed()
        continue
      }

      // stop before the last one (catch-all)
      const lastIdx = Math.max(metrics.length - 1, 0)
      let i = 2
      for (; i < lastIdx; i++) {
        if (rep.getIn(['telemetry', 'bandwidth_cap']) <= metrics[i].threshold) {
          metrics[i].total = BigNumber(rep_weight)
            .plus(metrics[i].total)
            .toFixed()
          break
        }
      }

      // add to catch all
      if (i === lastIdx) {
        metrics[i].total = BigNumber(rep_weight)
          .plus(metrics[i].total)
          .toFixed()
      }
    }

    // convert to percentage of online stake
    for (let i = 0; i < metrics.length; i++) {
      metrics[i].value = BigNumber(metrics[i].total)
        .dividedBy(totalWeight)
        .multipliedBy(100)
        .toFixed(2)
    }

    return { metrics }
  }
)

export default connect(mapStateToProps)(RepresentativesBandwidthByWeight)
