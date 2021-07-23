import BigNumber from 'bignumber.js'
import React from 'react'
import PropTypes from 'prop-types'

import './display-nano.styl'

export default class DisplayNano extends React.Component {
  render() {
    const { value } = this.props
    const raw = BigNumber(value || 0)
    const nano = raw.shiftedBy(-30).toString().split('.')

    return (
      <div className='display__nano'>
        <div className='integer'>{BigNumber(nano[0]).toFormat()}</div>
        {Boolean(nano[1]) && <div className='fraction'>.{nano[1]}</div>}
        <div className='unit'>nano</div>
      </div>
    )
  }
}

DisplayNano.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}
