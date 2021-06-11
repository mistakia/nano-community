import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesVersionByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Versions'
        subtitle='By Online Weight'
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesVersionByWeight.propTypes = {
  metrics: PropTypes.array
}
