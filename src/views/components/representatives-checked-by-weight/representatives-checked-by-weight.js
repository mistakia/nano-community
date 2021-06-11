import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesCheckedByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Blocks Differential'
        subtitle='By Online Weight'
        tooltip='Displays the amount of voting weight that is within X number of blocks from the leading node. Useful for getting a sense of how in-sync block propagation is within the network'
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesCheckedByWeight.propTypes = {
  metrics: PropTypes.array
}
