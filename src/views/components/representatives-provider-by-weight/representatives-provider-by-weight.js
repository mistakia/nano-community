import React from 'react'
import PropTypes from 'prop-types'

import MetricCard from '@components/metric-card'

export default class RepresentativesProviderByWeight extends React.Component {
  render() {
    const { metrics } = this.props
    return (
      <MetricCard
        title='Hosting Provider'
        subtitle='By Online Weight'
        unit='%'
        max={100}
        metrics={metrics}
      />
    )
  }
}

RepresentativesProviderByWeight.propTypes = {
  metrics: PropTypes.array
}
