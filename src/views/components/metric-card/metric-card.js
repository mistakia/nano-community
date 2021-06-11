import React from 'react'
import PropTypes from 'prop-types'

import './metric-card.styl'

export default class MetricCard extends React.Component {
  render() {
    const { metrics, title, subtitle, max, unit } = this.props
    const rows = metrics.map((p, i) => {
      const width = (p.value / max) * 100
      const value = unit ? `${p.value}${unit}` : p.value
      return (
        <div className='metric__card-row' key={i}>
          <div className='metric__card-row-label'>{p.label}</div>
          <div className='metric__card-row-value'>{value}</div>
          <div
            className='metric__card-row-percentage'
            style={{ width: width + '%' }}
          />
        </div>
      )
    })
    return (
      <div className='metric__card'>
        <div className='metric__card-header'>
          <div className='metric__card-title'>{title}</div>
          {Boolean(subtitle) && (
            <div className='metric__card-subtitle'>{subtitle}</div>
          )}
        </div>
        <div className='metric__card-body'>{rows}</div>
      </div>
    )
  }
}

MetricCard.propTypes = {
  metrics: PropTypes.array,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  unit: PropTypes.string,
  max: PropTypes.number
}
