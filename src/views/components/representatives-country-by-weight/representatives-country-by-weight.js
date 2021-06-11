import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesCountryByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Countries'
        subtitle='By Online Weight'
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesCountryByWeight.propTypes = {
  metrics: PropTypes.array
}
