import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getLedger, ledgerActions } from '@core/ledger'
import { base_ranges } from '@core/constants'

import LedgerPage from './ledger'

const mapStateToProps = createSelector(getLedger, (ledger) => {
  const daily = ledger.get('daily', [])
  const data = {
    reused_addresses: []
  }

  const metrics = [
    'active_addresses',

    'blocks',
    'open_count',
    'send_count',
    'receive_count',
    'change_count',

    'change_volume',
    'send_volume',

    'total_usd_send_value',

    // TODO open_volume
    // TODO receive_volume

    ...base_ranges.map((r) => `${r}_count`),
    ...base_ranges.map((r) => `${r}_account_count`)
  ]

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i]
    data[metric] = []
  }

  base_ranges.forEach((r) => {
    data[`${r}_relative_supply`] = []
  })

  daily.forEach((d) => {
    const timestamp = parseInt(d.timestamp, 10) * 1000
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i]
      data[metric].push([timestamp, d[metric]])
    }

    data.reused_addresses.push([timestamp, d.active_addresses - d.open_count])

    // calculate relative supply distribution
    const total_supply = base_ranges.reduce((acc, r) => {
      return acc + BigInt(d[`${r}_total_balance`] || 0)
    }, BigInt(0))

    base_ranges.forEach((r) => {
      const total_balance = BigInt(d[`${r}_total_balance`] || 0)
      const relative_supply = BigNumber(total_balance)
        .div(total_supply)
        .times(100)
        .toFixed(5)
      data[`${r}_relative_supply`].push([timestamp, relative_supply])
    })
  })

  return { data, isLoading: ledger.get('isLoading') }
})

const mapDispatchToProps = {
  load: ledgerActions.getDaily
}

export default connect(mapStateToProps, mapDispatchToProps)(LedgerPage)
