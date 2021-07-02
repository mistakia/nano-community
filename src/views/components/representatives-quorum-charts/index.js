import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getNetwork, networkActions } from '@core/network'
import { groupBy, median } from '@core/utils'

import RepresentativesQuorumCharts from './representatives-quorum-charts'

const mapStateToProps = createSelector(getNetwork, (network) => {
  const weights = network.get('weightHistory', [])
  const grouped = groupBy(weights, 'address')
  const data = {
    quorum_delta: {},
    online_stake_total: {},
    trended_stake_total: {}
  }
  const types = ['quorum_delta', 'online_stake_total', 'trended_stake_total']
  const stats = ['min', 'max', 'median']

  types.forEach((t) => {
    data[t] = {}
    stats.forEach((s) => {
      data[t][s] = []
    })
  })

  const timestamps = groupBy(weights, 'timestamp')

  for (const key in timestamps) {
    const items = timestamps[key]
    for (const type in data) {
      const values = items.map((i) => i[type])
      const timestamp = parseInt(key, 10) * 1000
      data[type].min.push([
        timestamp,
        BigNumber(Math.min(...values))
          .shiftedBy(-36)
          .toNumber(),
        'Min'
      ])
      data[type].max.push([
        timestamp,
        BigNumber(Math.max(...values))
          .shiftedBy(-36)
          .toNumber(),
        'Max'
      ])
      data[type].median.push([
        timestamp,
        BigNumber(median(values)).shiftedBy(-36).toNumber(),
        'Median'
      ])
    }
  }

  const peerData = []
  for (const address in grouped) {
    const items = grouped[address]
    const peersStake = []
    for (const item of items) {
      const timestamp = item.timestamp * 1000
      peersStake.push([
        timestamp,
        BigNumber(item.peers_stake_total).shiftedBy(-36).toNumber(),
        address
      ])
    }
    peerData.push(peersStake)
  }

  return {
    data,
    peerData
  }
})

const mapDispatchToProps = {
  load: networkActions.getWeightHistory
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RepresentativesQuorumCharts)
