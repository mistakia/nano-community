import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import BigNumber from 'bignumber.js'
import percentile from 'percentile'

import { getRepresentatives, getAccounts } from '@core/accounts'
import { REP_MAX_WEIGHT } from '@core/constants'
import { getNetwork } from '@core/network'

import RepresentativeAlerts from './representative-alerts'

const mapStateToProps = createSelector(
  getRepresentatives,
  getAccounts,
  getNetwork,
  (representatives, accounts, network) => {
    const items = {}

    const reps = representatives.filter((a) =>
      BigNumber(a.getIn(['account_meta', 'weight'])).isGreaterThan(1e34)
    )

    const overweight = reps.filter((a) =>
      BigNumber(a.getIn(['account_meta', 'weight'])).isGreaterThan(
        REP_MAX_WEIGHT
      )
    )
    overweight.forEach((account) => {
      items[account.account] = { account, type: 'overweight', severity: 1 }
    })

    const lowUptime = reps.filter((a) => {
      const uptime = a.get('uptime')
      const online = uptime.filter((u) => u.online)
      const total = uptime.size
      const pct = online / total
      return pct < 0.75
    })
    lowUptime.forEach((account) => {
      items[account.account] = { account, type: 'low uptime', severity: 2 }
    })

    const confirmationDifferentials = reps
      .map((a) => a.getIn(['telemetry', 'cemented_behind']))
      .toJS()
    const p95 = percentile([95], confirmationDifferentials.filter(Boolean))
    const behind = reps.filter(
      (a) => a.getIn(['telemetry', 'cemented_behind'], 0) > p95
    )
    behind.forEach((account) => {
      items[account.account] = { account, type: 'behind', severity: 2 }
    })

    const offline = reps.filter(
      (a) =>
        !a.get('is_online') &&
        dayjs(a.get('last_seen') * 1000).isBefore(dayjs().subtract(1, 'hour'))
    )
    offline.forEach((account) => {
      items[account.account] = { account, type: 'offline', severity: 3 }
    })

    const sorted = Object.values(items).sort(
      (a, b) =>
        b.severity - a.severity ||
        b.account.getIn(['account_meta', 'weight']) -
          a.account.getIn(['account_meta', 'weight'])
    )

    return {
      items: sorted,
      representatives_is_loading: accounts.get('representatives_is_loading'),
      onlineWeight: network.getIn(['weight', 'onlineWeight', 'median'], 0)
    }
  }
)

export default connect(mapStateToProps)(RepresentativeAlerts)
