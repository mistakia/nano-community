import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import {
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight
} from '@core/accounts'

import RepresentativesCountryByWeight from './representatives-country-by-weight'

const mapStateToProps = createSelector(
  getOnlineRepresentatives,
  getOnlineRepresentativesTotalWeight,
  (accounts, totalWeight) => {
    const metrics = []
    const countries = {
      unknown: 0
    }

    for (const rep of accounts.valueSeq()) {
      const weight = rep.getIn(['account_meta', 'weight'])
      if (!weight) continue

      const country = rep.getIn(['network', 'country'])
      if (!country) {
        countries.unknown = BigNumber(weight).plus(countries.unknown).toFixed()
        continue
      }

      countries[country] = BigNumber(weight)
        .plus(countries[country] || 0)
        .toFixed()
    }

    for (const [country, weight] of Object.entries(countries)) {
      const filter =
        country === 'unknown'
          ? {
              empty: true
            }
          : {
              match: country
            }
      metrics.push({
        label: country,
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

export default connect(mapStateToProps)(RepresentativesCountryByWeight)
