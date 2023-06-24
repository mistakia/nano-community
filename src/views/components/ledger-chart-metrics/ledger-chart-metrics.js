import React from 'react'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'

import './ledger-chart-metrics.styl'

export default class LedgerChartMetrics extends React.Component {
  render() {
    const { data, label, show_total = false } = this.props
    const values = data.map((d) => d[1])
    const max = values.length ? Math.max(...values) : null
    const min = values.length ? Math.min(...values.filter(Boolean)) : null

    const maxIdx = values.indexOf(max)
    const minIdx = values.indexOf(min)
    const maxTimestamp = maxIdx !== -1 ? data[maxIdx][0] : null
    const minTimestamp = minIdx !== -1 ? data[minIdx][0] : null

    const total = values.reduce((acc, val) => acc.plus(val || 0), BigNumber(0))

    return (
      <div className='ledger__chart-section'>
        <div className='section__heading'>
          <span>{label}</span>
        </div>
        <div className='ledger__chart-section-body'>
          <div className='leger__chart-row'>
            <div className='ledger__chart-row-label'>Min</div>
            <div className='ledger__chart-row-value'>
              {min ? BigNumber(min).toFormat(0) : '-'}
            </div>
            <div className='ledger__chart-row-value'>
              {minTimestamp ? dayjs(minTimestamp).format('MMM D, YYYY') : '-'}
            </div>
          </div>
          <div className='leger__chart-row'>
            <div className='ledger__chart-row-label'>Max</div>
            <div className='ledger__chart-row-value'>
              {max ? BigNumber(max).toFormat(0) : '-'}
            </div>
            <div className='ledger__chart-row-value'>
              {maxTimestamp ? dayjs(maxTimestamp).format('MMM D, YYYY') : '-'}
            </div>
          </div>
          {show_total && (
            <div className='leger__chart-row'>
              <div className='ledger__chart-row-label'>Total</div>
              <div className='ledger__chart-row-value'>
                {total ? BigNumber(total).toFormat(0) : '-'}
              </div>
              <div className='ledger__chart-row-value' />
            </div>
          )}
        </div>
      </div>
    )
  }
}

LedgerChartMetrics.propTypes = {
  label: PropTypes.string,
  data: PropTypes.array,
  show_total: PropTypes.bool
}
