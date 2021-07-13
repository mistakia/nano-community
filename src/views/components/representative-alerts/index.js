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
  (reps, accounts, network) => {
    const items = {}

    /**************** overweight ****************/
    const overweight = reps.filter((a) =>
      BigNumber(a.getIn(['account_meta', 'weight'])).isGreaterThan(
        REP_MAX_WEIGHT
      )
    )
    overweight.forEach((account) => {
      items[account.account] = { account, type: 'overweight' }
    })

    /**************** behind ****************/
    const confirmationDifferentials = reps
      .map((a) => a.getIn(['telemetry', 'cemented_behind']))
      .toJS()
    const p95 = percentile([95], confirmationDifferentials.filter(Boolean))
    const behind = reps.filter(
      (a) => a.getIn(['telemetry', 'cemented_behind'], 0) > p95
    )
    behind.forEach((account) => {
      items[account.account] = { account, type: 'behind' }
    })

    /**************** offline ****************/
    const offline = reps.filter(
      (a) =>
        !a.get('is_online') &&
        dayjs(a.get('last_seen') * 1000).isBefore(dayjs().subtract(1, 'hour'))
    )
    offline.forEach((account) => {
      items[account.account] = { account, type: 'offline' }
    })

    const sorted = Object.values(items).sort(
      (a, b) =>
        b.account.getIn(['account_meta', 'weight']) -
        a.account.getIn(['account_meta', 'weight'])
    )

    return {
      items: sorted,
      isLoading: accounts.get('isLoading'),
      onlineWeight: network.getIn(['weight', 'onlineWeight', 'median'], 0)
    }
  }
)

export default connect(mapStateToProps)(RepresentativeAlerts)
