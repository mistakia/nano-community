import React from 'react'
import PropTypes from 'prop-types'

import './network-highlights.styl'

// the four figures that prove the properties above, live
export default function NetworkHighlights({ nanodb_stats, wattHour }) {
  const latency_ms = nanodb_stats?.median_latency_ms_last_10_mins
  const transactions = nanodb_stats?.confirmations_last_24_hours

  const figures = [
    {
      value: latency_ms ? `${Math.round(latency_ms)} ms` : null,
      label: 'To final'
    },
    { value: '$0', label: 'In fees' },
    {
      value: transactions ? transactions.toLocaleString('en-US') : null,
      label: 'Transactions a day'
    },
    {
      value: wattHour ? `${Math.round((wattHour * 24) / 1000)} kWh` : null,
      label: 'Runs the network a day'
    }
  ].filter(({ value }) => value)

  return (
    <div className='network-highlights'>
      <div className='network-highlights__caption'>Live from the network</div>
      <div className='network-highlights__figures'>
        {figures.map(({ value, label }) => (
          <div className='network-highlights__figure' key={label}>
            <div className='network-highlights__value'>{value}</div>
            <div className='network-highlights__label'>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

NetworkHighlights.propTypes = {
  nanodb_stats: PropTypes.object,
  wattHour: PropTypes.number
}
