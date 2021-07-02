import React from 'react'
import PropTypes from 'prop-types'

import './uptime.styl'

const online = '#3bd671'
const offline = '#ee6666'

export default class Uptime extends React.Component {
  render() {
    const { data, length } = this.props

    const ticks = []
    const sliced = length ? data.slice(0, length) : data
    sliced.forEach((d, key) =>
      ticks.push(
        <rect
          key={key}
          height='14'
          width='3'
          y='0'
          x={key * 5}
          rx='1.625'
          ry='1.625'
          fill={d.online ? online : offline}
        />
      )
    )

    return (
      <svg height='14' className='uptime'>
        {ticks}
      </svg>
    )
  }
}

Uptime.propTypes = {
  data: PropTypes.array,
  length: PropTypes.number
}
