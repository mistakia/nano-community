import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import dayjs from 'dayjs'
import BigNumber from 'bignumber.js'

import { getRepresentatives, getAccounts } from '@core/accounts'
import { REP_MAX_WEIGHT } from '@core/constants'
import { getNetwork } from '@core/network'
import {
  is_representative_low_uptime,
  is_representative_cemented_behind
} from '#common/representative-alert-rules.mjs'

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
      return is_representative_low_uptime({
        online_count: online.size,
        total_count: uptime.size
      })
    })
    lowUptime.forEach((account) => {
      items[account.account] = { account, type: 'low uptime', severity: 2 }
    })

    const behind = reps.filter((a) =>
      is_representative_cemented_behind(
        a.getIn(['telemetry', 'cemented_behind'], 0)
      )
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
