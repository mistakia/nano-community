import db from '#db'
import resolve_signer_account from './resolve-signer-account.mjs'
import { get_average_power_watts } from './parse-representative-power-reading.mjs'

// Orders readings by measurement_ended_at, then issued_at, then message
// digest, so the current reading does not depend on arrival order
const is_newer = (reading, current) =>
  reading.measurement_ended_at !== current.measurement_ended_at
    ? reading.measurement_ended_at > current.measurement_ended_at
    : reading.issued_at !== current.issued_at
      ? reading.issued_at > current.issued_at
      : reading.message_digest > current.message_digest

// The current signed power reading of each account, keyed by account. Each
// message counts for the account its key acted for at issued_at.
export default async function load_representative_power_readings({
  accounts,
  connection = db
}) {
  const messages = await connection('nano_community_messages')
    .select('public_key', 'message', 'message_digest', 'created_at')
    .where({ operation: 'SET_REPRESENTATIVE_POWER_READING' })

  const wanted = new Set(accounts)
  const readings = new Map()
  for (const { public_key, message, message_digest, created_at } of messages) {
    const { account: named_account, parameters } = JSON.parse(message)
    const issued_at = Number(created_at)
    const account = await resolve_signer_account({
      connection,
      public_key,
      issued_at,
      account: named_account
    })
    if (!wanted.has(account)) {
      continue
    }

    const {
      energy_watt_hours,
      measurement_method,
      measurement_started_at,
      measurement_ended_at
    } = parameters.content
    const reading = {
      energy_watt_hours,
      average_power_watts: get_average_power_watts(parameters.content),
      measurement_method,
      measurement_started_at,
      measurement_ended_at,
      issued_at,
      message_digest
    }
    const current = readings.get(account)
    if (!current || is_newer(reading, current)) {
      readings.set(account, reading)
    }
  }
  return readings
}
