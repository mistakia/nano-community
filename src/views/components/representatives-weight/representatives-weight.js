import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import { useTranslation } from 'react-i18next'

import './representatives-weight.styl'

export default function RepresentativesWeight({ network }) {
  const { t } = useTranslation()
  const online_weight = BigNumber(
    network.getIn(['weight', 'onlineWeight', 'median'], 0)
  )
  const trended_weight = BigNumber(
    network.getIn(['weight', 'trendedWeight', 'median'], 0)
  )
  const quorum_total = BigNumber.max(online_weight, trended_weight)
  const quorum_weight_delta = quorum_total.multipliedBy(0.67)

  const online_selected = online_weight.isGreaterThan(trended_weight)

  const online_nano = online_weight.shiftedBy(-36)
  const trended_nano = trended_weight.shiftedBy(-36)
  const quorum_nano = quorum_weight_delta.shiftedBy(-36)
  return (
    <div className='representatives__weight-container'>
      <div className='representatives__weight'>
        <div
          className={`representatives__weight-section ${
            !online_selected && 'selected'
          }`}>
          <div className='representatives__weight-section-label'>
            {t('representatives_weight.trended', 'Trended')}
          </div>
          <div className='representatives__weight-section-value'>
            {trended_nano.isNaN() ? '-' : `${trended_nano.toFormat(1)}M`}
          </div>
        </div>
        <div
          className={`representatives__weight-section ${
            online_selected && 'selected'
          }`}>
          <div className='representatives__weight-section-label'>
            {t('common.online', 'Online')}
          </div>
          <div className='representatives__weight-section-value'>
            {online_nano.isNaN() ? '-' : `${online_nano.toFormat(1)}M`}
          </div>
        </div>
        <div className='representatives__weight-section'>
          <div className='representatives__weight-section-label'>
            {t('common.quorum_delta', 'Quorum Delta')}
          </div>
          <div className='representatives__weight-section-value'>
            {quorum_nano.isNaN() ? '-' : `${quorum_nano.toFormat(1)}M`}
          </div>
        </div>
      </div>
    </div>
  )
}

RepresentativesWeight.propTypes = {
  network: ImmutablePropTypes.map
}
