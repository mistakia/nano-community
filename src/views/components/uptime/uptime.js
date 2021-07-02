import React from 'react'
import PropTypes from 'prop-types'

import './uptime.styl'

export default class Uptime extends React.Component {
  render() {
    const { data, length } = this.props

    const ticks = []
    const sliced = length ? data.slice(0, length) : data
    sliced.forEach((d, key) =>
      ticks.push(
        <div key={key} className='uptime-tick' data-online={d.online} />
      )
    )

    return <div className='uptime'>{ticks}</div>
  }
}

Uptime.propTypes = {
  data: PropTypes.array
}
