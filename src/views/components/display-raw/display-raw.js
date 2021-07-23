import React from 'react'
import PropTypes from 'prop-types'

import './display-raw.styl'

export default class DisplayRaw extends React.Component {
  render() {
    const { value } = this.props

    return (
      <div className='display__raw'>
        <div className='raw'>{value}</div>
        <div className='unit'>raw</div>
      </div>
    )
  }
}

DisplayRaw.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}
