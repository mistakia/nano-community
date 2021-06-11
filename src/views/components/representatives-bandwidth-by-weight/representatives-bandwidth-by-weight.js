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
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesBandwidthByWeight.propTypes = {
  metrics: PropTypes.array
}
