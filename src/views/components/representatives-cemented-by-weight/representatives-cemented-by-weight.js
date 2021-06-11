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
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesCementedByWeight.propTypes = {
  metrics: PropTypes.array
}
