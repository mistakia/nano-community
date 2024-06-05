import React, { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'

import './representatives-weight.styl'

import { format_value } from '@core/utils'

export default function RepresentativesWeight({
  network,
  principal_representative_minimum_weight
}) {
  const pr_min_weight = useMemo(() => {
    return principal_representative_minimum_weight
      ? format_value({
          value: BigNumber(principal_representative_minimum_weight)
            .shiftedBy(-30)
            .toNumber()
        })
      : '-'
  }, [principal_representative_minimum_weight])

  const online_weight = useMemo(
    () => BigNumber(network.getIn(['weight', 'onlineWeight', 'median'], 0)),
    [network]
  )

  const trended_weight = useMemo(
    () => BigNumber(network.getIn(['weight', 'trendedWeight', 'median'], 0)),
    [network]
  )

  const quorum_total = useMemo(
    () => BigNumber.max(online_weight, trended_weight),
    [online_weight, trended_weight]
  )
  const quorum_weight_delta = useMemo(
    () => quorum_total.multipliedBy(0.67),
    [quorum_total]
  )

  const online_selected = useMemo(
    () => online_weight.isGreaterThan(trended_weight),
    [online_weight, trended_weight]
  )

  const online_nano = useMemo(
    () => online_weight.shiftedBy(-36),
    [online_weight]
  )
  const trended_nano = useMemo(
    () => trended_weight.shiftedBy(-36),
    [trended_weight]
  )
  const quorum_nano = useMemo(
    () => quorum_weight_delta.shiftedBy(-36),
    [quorum_weight_delta]
  )

  return (
    <div className='representatives__weight-container'>
      <div className='representatives__weight'>
        <div
          className={`representatives__weight-section ${
            !online_selected && 'selected'
          }`}>
          <div className='representatives__weight-section-label'>Trended</div>
          <div className='representatives__weight-section-value'>
            {trended_nano.isNaN() ? '-' : `${trended_nano.toFormat(1)}M`}
          </div>
        </div>
        <div
          className={`representatives__weight-section ${
            online_selected && 'selected'
          }`}>
          <div className='representatives__weight-section-label'>Online</div>
          <div className='representatives__weight-section-value'>
            {online_nano.isNaN() ? '-' : `${online_nano.toFormat(1)}M`}
          </div>
        </div>
        <div className='representatives__weight-section'>
          <div className='representatives__weight-section-label'>
            Quorum Delta
          </div>
          <div className='representatives__weight-section-value'>
            {quorum_nano.isNaN() ? '-' : `${quorum_nano.toFormat(1)}M`}
          </div>
        </div>
        <div className='representatives__weight-section'>
          <div className='representatives__weight-section-label'>
            PR Threshold
          </div>
          <div className='representatives__weight-section-value'>
            {pr_min_weight}
          </div>
        </div>
      </div>
    </div>
  )
}

RepresentativesWeight.propTypes = {
  network: ImmutablePropTypes.map,
  principal_representative_minimum_weight: ImmutablePropTypes.number
}
