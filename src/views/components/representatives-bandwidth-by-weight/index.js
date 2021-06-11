import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getRepresentatives,
  getRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesBandwidthByWeight from './representatives-bandwidth-by-weight'

const mapStateToProps = createSelector(
  getRepresentatives,
  getRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const thresholds = [
      {
        label: 'Unknown',
        threshold: null
      },
      {
        label: 'Unlimited',
        threshold: 0
      },
      {
        label: '1Mb to 5Mb',
        threshold: 5 * (1024 * 1024)
      },
      {
        label: '6Mb to 10Mb',
        threshold: 10 * (1024 * 1024)
      },
      {
        label: '11Mb to 20Mb',
        threshold: 20 * (1024 * 1024)
      },
      {
        label: '20Mb to 100Mb',
        threshold: 100 * (1024 * 1024)
      },
      {
        label: '101Mb+',
        threshold: null
      }
    ]
    const metrics = thresholds.map((p) => ({ ...p, total: 0 }))
    for (const rep of accounts.valueSeq()) {
      if (!rep.telemetry.weight) continue

      // add to unknown
      if (rep.telemetry.bandwidth_cap === undefined) {
        metrics[0].total = BigNumber(rep.telemetry.weight)
          .plus(metrics[0].total)
          .toFixed()
        continue
      }

      // add to unlimited
      if (rep.telemetry.bandwidth_cap === 0) {
        metrics[1].total = BigNumber(rep.telemetry.weight)
          .plus(metrics[0].total)
          .toFixed()
        continue
      }

      // stop before the last one (catch-all)
      const lastIdx = Math.max(metrics.length - 1, 0)
      let i = 2
      for (; i < lastIdx; i++) {
        if (rep.telemetry.bandwidth_cap <= metrics[i].threshold) {
          metrics[i].total = BigNumber(rep.telemetry.weight)
            .plus(metrics[i].total)
            .toFixed()
          break
        }
      }

      // add to catch all
      if (i === lastIdx) {
        metrics[i].total = BigNumber(rep.telemetry.weight)
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
