import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getLedger, ledgerActions } from '@core/ledger'

import LedgerPage from './ledger'

const mapStateToProps = createSelector(getLedger, (ledger) => {
  const daily = ledger.get('daily', [])
  const data = {
    reused_addresses: []
  }
  const base_ranges = [
    '_1000000',
    '_100000',
    '_10000',
    '_1000',
    '_100',
    '_10',
    '_1',
    '_01',
    '_001',
    '_0001',
    '_00001',
    '_000001',
    '_000001_below'
  ]

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

    ...base_ranges.map((r) => `${r}_count`)
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
      return acc + BigInt(d[`${r}_total_balance`])
    }, BigInt(0))

    base_ranges.forEach((r) => {
      const total_balance = BigInt(d[`${r}_total_balance`])
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
