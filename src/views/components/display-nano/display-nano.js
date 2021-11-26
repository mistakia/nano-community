import BigNumber from 'bignumber.js'
import React from 'react'
import PropTypes from 'prop-types'

import './display-nano.styl'

export default class DisplayNano extends React.Component {
  render() {
    const { value } = this.props
    const raw = BigNumber(value || 0)
    const nano = raw.shiftedBy(-30).toNumber()
    const parts = (nano >= 1 ? nano : BigNumber(nano).toFormat())
      .toString()
      .split('.')

    return (
      <div className='display__nano'>
        <div className='unit'>Ӿ</div>
        <div className='integer'>{BigNumber(parts[0]).toFormat()}</div>
        {Boolean(parts[1]) && <div className='fraction'>.{parts[1]}</div>}
      </div>
    )
  }
}

DisplayNano.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}
