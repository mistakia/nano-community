import db from '#db'
import { estimate_hardware_power_watts } from '#common/representative-hardware-power.mjs'
import resolve_signer_account from './resolve-signer-account.mjs'
import { get_average_power_watts } from './parse-representative-power-reading.mjs'

// The latest message of one operation for each wanted account, keyed by
// account. Each message counts for the account its key acted for at
// issued_at. compare orders two built values; ties fall to the message digest,
// so the result does not depend on arrival order.
async function load_latest_messages({
  operation,
  accounts,
  build,
  compare,
  connection
}) {
  const messages = await connection('nano_community_messages')
    .select('public_key', 'message', 'message_digest', 'created_at')
    .where({ operation })

  const wanted = new Set(accounts)
  const latest = new Map()
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

    const value = {
      ...build(parameters.content),
      issued_at,
      message_digest
    }
    const current = latest.get(account)
    const order = current ? compare(value, current) : 1
    if (order > 0 || (order === 0 && message_digest > current.message_digest)) {
      latest.set(account, value)
    }
  }
  return latest
}

// The current signed power reading of each account: the latest by
// measurement_ended_at, then issued_at
export const load_representative_power_readings = ({
  accounts,
  connection = db
}) =>
  load_latest_messages({
    operation: 'SET_REPRESENTATIVE_POWER_READING',
    accounts,
    connection,
    build: (content) => ({
      energy_watt_hours: content.energy_watt_hours,
      average_power_watts: get_average_power_watts(content),
      measurement_method: content.measurement_method,
      measurement_started_at: content.measurement_started_at,
      measurement_ended_at: content.measurement_ended_at
    }),
    compare: (a, b) =>
      a.measurement_ended_at - b.measurement_ended_at ||
      a.issued_at - b.issued_at
  })

// The current hardware report of each account, the latest by issued_at, with
// the power estimated from it, or null where its CPU generation is unknown
export const load_representative_hardware_reports = ({
  accounts,
  connection = db
}) =>
  load_latest_messages({
    operation: 'SET_REPRESENTATIVE_HARDWARE',
    accounts,
    connection,
    build: (content) => {
      const estimate = estimate_hardware_power_watts(content)
      return {
        ...content,
        estimated_power_watts: estimate ? estimate.power_watts : null,
        cpu_generation: estimate ? estimate.cpu_generation : null
      }
    },
    compare: (a, b) => a.issued_at - b.issued_at
  })
