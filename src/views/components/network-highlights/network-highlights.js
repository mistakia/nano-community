import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import './network-highlights.styl'

// the four figures that prove the properties above, live
// "from 2 of 38 principal reps (0 measured)", dated by the oldest reading
const format_energy_coverage = ({
  reporting_count,
  principal_representative_count,
  measured_count,
  oldest_measured_at
}) => {
  const coverage = `from ${reporting_count} of ${principal_representative_count} principal reps (${measured_count} measured)`
  if (!oldest_measured_at) {
    return coverage
  }
  const oldest = new Date(oldest_measured_at * 1000).toISOString().slice(0, 10)
  return `${coverage}, oldest reading ${oldest}`
}

export default function NetworkHighlights({ nanodb_stats, energy }) {
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
      // the daily equivalent of the summed current power
      value:
        energy && energy.reporting_count
          ? `${Math.round((energy.watts * 24) / 1000)} kWh`
          : null,
      label: 'Energy a day',
      note: energy && (
        <Link to='/network-energy-usage'>{format_energy_coverage(energy)}</Link>
      )
    }
  ].filter(({ value }) => value)

  return (
    <div className='network-highlights'>
      <div className='network-highlights__caption'>Live from the network</div>
      <div className='network-highlights__figures'>
        {figures.map(({ value, label, note }) => (
          <div className='network-highlights__figure' key={label}>
            <div className='network-highlights__value'>{value}</div>
            <div className='network-highlights__label'>{label}</div>
            {note && <div className='network-highlights__note'>{note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

NetworkHighlights.propTypes = {
  nanodb_stats: PropTypes.object,
  energy: PropTypes.shape({
    watts: PropTypes.number,
    reporting_count: PropTypes.number,
    measured_count: PropTypes.number,
    principal_representative_count: PropTypes.number,
    oldest_measured_at: PropTypes.number
  })
}
