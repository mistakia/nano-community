import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'

import './representatives-weight.styl'

export default class RepresentativesWeight extends React.Component {
  render() {
    const { network } = this.props
    const onlineWeight = BigNumber(
      network.getIn(['weight', 'onlineWeight', 'median'], 0)
    )
    const trendedWeight = BigNumber(
      network.getIn(['weight', 'trendedWeight', 'median'], 0)
    )
    const quorumTotal = BigNumber.max(onlineWeight, trendedWeight)
    const quorumWeightDelta = quorumTotal.multipliedBy(0.67)

    const onlineSelected = onlineWeight.isGreaterThan(trendedWeight)

    const onlineNano = onlineWeight.shiftedBy(-36)
    const trendedNano = trendedWeight.shiftedBy(-36)
    const quorumNano = quorumWeightDelta.shiftedBy(-36)
    return (
      <div className='representatives__weight-container'>
        <div className='representatives__weight'>
          <div
            className={`representatives__weight-section ${
              !onlineSelected && 'selected'
            }`}>
            <div className='representatives__weight-section-label'>Trended</div>
            <div className='representatives__weight-section-value'>
              {trendedNano.isNaN() ? '-' : `${trendedNano.toFormat(1)}M`}
            </div>
          </div>
          <div
            className={`representatives__weight-section ${
              onlineSelected && 'selected'
            }`}>
            <div className='representatives__weight-section-label'>Online</div>
            <div className='representatives__weight-section-value'>
              {onlineNano.isNaN() ? '-' : `${onlineNano.toFormat(1)}M`}
            </div>
          </div>
          <div className='representatives__weight-section'>
            <div className='representatives__weight-section-label'>
              Quorum Delta
            </div>
            <div className='representatives__weight-section-value'>
              {quorumNano.isNaN() ? '-' : `${quorumNano.toFormat(1)}M`}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

RepresentativesWeight.propTypes = {
  network: ImmutablePropTypes.map
}
