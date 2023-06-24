import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getLedger, ledgerActions } from '@core/ledger'

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

    '_1000000_count',
    '_100000_count',
    '_10000_count',
    '_1000_count',
    '_100_count',
    '_10_count',
    '_1_count',
    '_01_count',
    '_001_count',
    '_0001_count',
    '_00001_count',
    '_000001_count',
    '_000001_below_count'
  ]

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i]
    data[metric] = []
  }

  daily.forEach((d) => {
    const timestamp = parseInt(d.timestamp, 10) * 1000
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i]
      data[metric].push([timestamp, d[metric]])
    }

    data.reused_addresses.push([timestamp, d.active_addresses - d.open_count])
  })

  return { data, isLoading: ledger.get('isLoading') }
})

const mapDispatchToProps = {
  load: ledgerActions.getDaily
}

export default connect(mapStateToProps, mapDispatchToProps)(LedgerPage)
