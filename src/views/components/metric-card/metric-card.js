import React from 'react'
import PropTypes from 'prop-types'
import Tooltip from '@material-ui/core/Tooltip'
import HelpOutlineIcon from '@material-ui/icons/HelpOutline'

import './metric-card.styl'

const formatValue = (value, unit) => {
  if (value === undefined || Number.isNaN(value) || value === 'NaN') {
    return '-'
  }
  return unit ? `${value}${unit}` : value
}

export default class MetricCard extends React.Component {
  handleClick = (field, value, label) => {
    this.props.filter({ field, value, label })
  }

  render() {
    const {
      metrics,
      title,
      subtitle,
      max,
      unit,
      tooltip,
      field,
      selectedField,
      selectedLabel
    } = this.props
    const isSelectedField = field === selectedField
    const rows = metrics.map((p, i) => {
      const width = (p.value / max) * 100
      const classNames = ['metric__card-row']

      const isSelected = isSelectedField && p.label === selectedLabel
      if (isSelected) classNames.push('selected')

      return (
        <div
          className={classNames.join(' ')}
          key={i}
          onClick={() => this.handleClick(field, p.filter, p.label)}>
          <div className='metric__card-row-label'>{p.label}</div>
          <div className='metric__card-row-value'>
            {formatValue(p.value, unit)}
          </div>
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
          {Boolean(tooltip) && (
            <Tooltip title={tooltip} className='metric__card-tooltip'>
              <HelpOutlineIcon />
            </Tooltip>
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
  tooltip: PropTypes.string,
  unit: PropTypes.string,
  max: PropTypes.number,
  field: PropTypes.string,
  filter: PropTypes.func,
  selectedField: PropTypes.string,
  selectedLabel: PropTypes.string
}
