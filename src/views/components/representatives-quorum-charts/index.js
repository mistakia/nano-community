import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import BigNumber from 'bignumber.js'

import { getNetwork, networkActions } from '@core/network'
import { groupBy } from '@core/utils'

import RepresentativesQuorumCharts from './representatives-quorum-charts'

const mapStateToProps = createSelector(getNetwork, (network) => {
  const weights = network.get('weightHistory', [])
  const grouped = groupBy(weights, 'address')
  const data = []
  for (const address in grouped) {
    const items = grouped[address]
    const onlineStake = []
    const peersStake = []
    const trendedStake = []
    const quorumDelta = []
    for (const item of items) {
      const timestamp = item.timestamp * 1000
      onlineStake.push([
        timestamp,
        BigNumber(item.online_stake_total).shiftedBy(-36).toNumber()
      ])
      peersStake.push([
        timestamp,
        BigNumber(item.peers_stake_total).shiftedBy(-36).toNumber()
      ])
      trendedStake.push([
        timestamp,
        BigNumber(item.trended_stake_total).shiftedBy(-36).toNumber()
      ])
      quorumDelta.push([
        timestamp,
        BigNumber(item.quorum_delta).shiftedBy(-36).toNumber()
      ])
    }
    data.push({
      address,
      onlineStake,
      peersStake,
      trendedStake,
      quorumDelta
    })
  }

  return {
    data
  }
})

const mapDispatchToProps = {
  load: networkActions.getWeightHistory
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RepresentativesQuorumCharts)
