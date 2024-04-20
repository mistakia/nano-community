import React from 'react'
import PropTypes from 'prop-types'

import './uptime.styl'

const online = '#3bd671'
const offline = '#ee6666'

export default function Uptime({ data, length, expanded }) {
  const ticks = []
  const sliced = length ? data.slice(0, length) : data
  if (sliced.length === 0) {
    return <div className='uptime'>no uptime data available</div>
  }
  const height = expanded ? 18 : 14
  const width = expanded ? 4 : 3
  const spacing = expanded ? 4 : 2
  sliced.forEach((d, key) =>
    ticks.push(
      <rect
        key={key}
        height={height}
        width={width}
        y='0'
        x={key * (spacing + width)}
        rx='1.625'
        ry='1.625'
        fill={d.online ? online : offline}
      />
    )
  )

  return (
    <div className='uptime'>
      <svg
        height={height}
        viewBox={`0 0 ${sliced.length * (spacing + width)} ${height}`}>
        {ticks}
      </svg>
      {Boolean(expanded) && (
        <div className='uptime__legend'>
          <div className='uptime__legend-text'>Now</div>
          <div className='uptime__legend-text'>
            {sliced.length > 0
              ? Math.round((sliced[sliced.length - 1].interval * 2) / 24)
              : 0}{' '}
            days ago
          </div>
        </div>
      )}
    </div>
  )
}

Uptime.propTypes = {
  data: PropTypes.array,
  length: PropTypes.number,
  expanded: PropTypes.bool
}
