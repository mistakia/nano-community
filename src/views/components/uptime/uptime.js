import React from 'react'
import PropTypes from 'prop-types'

import './uptime.styl'

export default class Uptime extends React.Component {
  render() {
    const { data } = this.props

    const ticks = []
    data.forEach((d, key) =>
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
