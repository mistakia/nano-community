import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesBandwidthByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Bandwidth Limit'
        subtitle='By Online Weight'
        tooltip='Displays the amount of voting weight based on the bandwidth limit set locally by each node'
        unit='%'
        max={100}
        field='telemetry.bandwidth_cap'
        metrics={metrics}
      />
    )
  }
}

RepresentativesBandwidthByWeight.propTypes = {
  metrics: PropTypes.array
}
