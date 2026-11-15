// The instrument, model or document a representative's power figure comes from
export const POWER_SOURCE_LABELS = {
  wall_meter: 'Wall meter',
  baseboard_management_controller: 'Baseboard management controller',
  hardware_estimate: 'Estimated from hardware',
  cpu_tdp_specification: 'CPU TDP specification'
}

// A representative's current power in watts, from the first source it has:
// 1. its latest signed reading, averaged over the window
// 2. an estimate from its latest signed hardware report
// 3. its CPU TDP specification (accounts.watt_hour)
// Null when it has none. as_of is the reading's window end or the report's
// signing time, in epoch seconds, and null for a specification. Every power
// figure on the site goes through this, so the homepage card, the table
// column and the data view cannot disagree.
export function get_representative_power({
  power_reading,
  hardware_report,
  watt_hour
}) {
  if (power_reading) {
    return {
      power_watts: power_reading.average_power_watts,
      power_source: power_reading.measurement_method,
      as_of: power_reading.measurement_ended_at
    }
  }
  if (hardware_report && hardware_report.estimated_power_watts !== null) {
    return {
      power_watts: hardware_report.estimated_power_watts,
      power_source: 'hardware_estimate',
      as_of: hardware_report.issued_at
    }
  }
  if (watt_hour > 0) {
    return {
      power_watts: watt_hour,
      power_source: 'cpu_tdp_specification',
      as_of: null
    }
  }
  return null
}

export const is_measured_power = (power) =>
  power.power_source === 'wall_meter' ||
  power.power_source === 'baseboard_management_controller'

// "70 W (Wall meter, 2026-11-13)" or "90 W (CPU TDP specification)"
export function format_representative_power(power) {
  if (!power) {
    return ''
  }
  const source = [POWER_SOURCE_LABELS[power.power_source]]
  if (power.as_of) {
    source.push(new Date(power.as_of * 1000).toISOString().slice(0, 10))
  }
  return `${Math.round(power.power_watts)} W (${source.join(', ')})`
}
