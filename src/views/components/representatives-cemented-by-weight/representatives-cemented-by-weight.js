import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesCementedByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Confirmation Differential'
        subtitle='By Online Weight'
        tooltip='Displays the amount of voting weight that is within X number of confirmations from the leading node. Helpful in knowing how well in-sync and aligned nodes are across the network'
        unit='%'
        max={100}
        field='telemetry.cemented_behind'
        metrics={metrics}
      />
    )
  }
}

RepresentativesCementedByWeight.propTypes = {
  metrics: PropTypes.array
}
