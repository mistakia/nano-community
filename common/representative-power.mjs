// The instrument or document a representative's power figure comes from
export const POWER_SOURCE_LABELS = {
  wall_meter: 'Wall meter',
  baseboard_management_controller: 'Baseboard management controller',
  cpu_tdp_specification: 'CPU TDP specification'
}

// A representative's current power in watts: the average over its latest
// signed reading, else its CPU TDP specification (accounts.watt_hour), else
// null. measured_at is the reading's window end in epoch seconds, and null for
// a specification. Every power figure on the site goes through this, so the
// homepage card, the table column and the data view cannot disagree.
export function get_representative_power({ power_reading, watt_hour }) {
  if (power_reading) {
    return {
      power_watts: power_reading.average_power_watts,
      power_source: power_reading.measurement_method,
      measured_at: power_reading.measurement_ended_at
    }
  }
  if (watt_hour > 0) {
    return {
      power_watts: watt_hour,
      power_source: 'cpu_tdp_specification',
      measured_at: null
    }
  }
  return null
}

// "70 W (Wall meter, 2026-11-13)" or "90 W (CPU TDP specification)"
export function format_representative_power(power) {
  if (!power) {
    return ''
  }
  const source = [POWER_SOURCE_LABELS[power.power_source]]
  if (power.measured_at) {
    source.push(new Date(power.measured_at * 1000).toISOString().slice(0, 10))
  }
  return `${Math.round(power.power_watts)} W (${source.join(', ')})`
}
