import db from '#db'
import { CommunityRequestError } from './verify-community-request.mjs'

// Instruments that measure the whole host. A RAPL counter measures only the
// CPU package, so it is not accepted.
export const MEASUREMENT_METHODS = [
  'wall_meter',
  'baseboard_management_controller'
]

// One full daily cycle
export const MIN_MEASUREMENT_WINDOW_SECONDS = 24 * 60 * 60

// Epoch seconds stay below this, so a millisecond value is rejected
const MAX_EPOCH_SECONDS = 1e11

const CONTENT_KEYS = [
  'energy_watt_hours',
  'measurement_method',
  'measurement_started_at',
  'measurement_ended_at'
]

const is_epoch_seconds = (value) =>
  Number.isInteger(value) && value > 0 && value < MAX_EPOCH_SECONDS

// Validates the parameters of a set_representative_power_reading message and
// returns the reading. Only malformed values are rejected: there is no
// plausibility ceiling, and a wrong reading is corrected by a newer one.
export function parse_representative_power_reading({
  content,
  references,
  issued_at
}) {
  if (references.length) {
    throw new CommunityRequestError(
      400,
      'set_representative_power_reading takes no references'
    )
  }
  const keys = Object.keys(content)
  if (
    keys.length !== CONTENT_KEYS.length ||
    !CONTENT_KEYS.every((key) => keys.includes(key))
  ) {
    throw new CommunityRequestError(
      400,
      `set_representative_power_reading content must be exactly {${CONTENT_KEYS.join(', ')}}`
    )
  }

  const {
    energy_watt_hours,
    measurement_method,
    measurement_started_at,
    measurement_ended_at
  } = content
  // The signed-message format carries only safe integers, so energy is in
  // whole watt-hours: under 0.25% of a 24-hour window at 20 W
  if (!Number.isSafeInteger(energy_watt_hours) || energy_watt_hours <= 0) {
    throw new CommunityRequestError(
      400,
      'energy_watt_hours must be a positive integer'
    )
  }
  if (!MEASUREMENT_METHODS.includes(measurement_method)) {
    throw new CommunityRequestError(
      400,
      `measurement_method must be one of ${MEASUREMENT_METHODS.join(', ')}`
    )
  }
  if (
    !is_epoch_seconds(measurement_started_at) ||
    !is_epoch_seconds(measurement_ended_at)
  ) {
    throw new CommunityRequestError(
      400,
      'measurement_started_at and measurement_ended_at must be integer epoch seconds'
    )
  }
  if (
    measurement_ended_at - measurement_started_at <
    MIN_MEASUREMENT_WINDOW_SECONDS
  ) {
    throw new CommunityRequestError(
      400,
      'the measurement window must be at least 24 hours'
    )
  }
  if (measurement_ended_at > issued_at) {
    throw new CommunityRequestError(
      400,
      'the measurement window must end no later than issued_at'
    )
  }

  return {
    energy_watt_hours,
    measurement_method,
    measurement_started_at,
    measurement_ended_at
  }
}

// The average power over the window, in watts
export const get_average_power_watts = ({
  energy_watt_hours,
  measurement_started_at,
  measurement_ended_at
}) =>
  energy_watt_hours / ((measurement_ended_at - measurement_started_at) / 3600)

export async function assert_representative({ account, connection = db }) {
  const row = await connection('accounts')
    .select('representative')
    .where({ account })
    .first()
  if (!row || row.representative !== true) {
    throw new CommunityRequestError(
      400,
      'a power reading must be signed for a representative account'
    )
  }
}
