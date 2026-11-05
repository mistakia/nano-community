import default_db from '#db'
import {
  NETWORK_EVENT_SEVERITIES,
  get_network_event_type,
  is_valid_network_event_phase,
  resolve_network_event_severity
} from '#common/network-event-types.mjs'
import build_network_event_id from './build-network-event-id.mjs'

const INSERT_BATCH_SIZE = 500

const is_plain_object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const trim_or_null = (value) =>
  typeof value === 'string' ? value.trim() || null : (value ?? null)

// Validates one event against the registry and returns its row. Throws on any
// invalid field, so a detector bug fails the run instead of storing bad rows.
export const build_network_event_row = (network_event) => {
  const { network_event_type, network_event_phase } = network_event
  if (!get_network_event_type(network_event_type)) {
    throw new Error(`unknown network_event_type ${network_event_type}`)
  }
  if (
    !is_valid_network_event_phase({ network_event_type, network_event_phase })
  ) {
    throw new Error(
      `invalid network_event_phase ${network_event_phase} for ${network_event_type}`
    )
  }
  const severity = resolve_network_event_severity(network_event)
  if (!NETWORK_EVENT_SEVERITIES.includes(severity)) {
    throw new Error(`invalid severity ${severity} for ${network_event_type}`)
  }
  if (!Number.isInteger(network_event.observed_at)) {
    throw new Error(
      `observed_at must be epoch seconds for ${network_event_type}`
    )
  }
  const evidence = network_event.evidence ?? {}
  if (!is_plain_object(evidence)) {
    throw new Error(`evidence must be an object for ${network_event_type}`)
  }

  return {
    network_event_id: build_network_event_id(network_event),
    network_event_type,
    network_event_phase,
    severity,
    representative_account: trim_or_null(network_event.representative_account),
    peer_address: trim_or_null(network_event.peer_address),
    node_id: trim_or_null(network_event.node_id),
    evidence,
    observed_at: network_event.observed_at
  }
}

// Inserts events, deduping on network_event_id, and writes the detector state
// and the watermark in the same transaction, so a failed run leaves all three
// where they were and the next run replays the same window.
const insert_network_events = async ({
  network_events = [],
  detector_name,
  detector_states = [],
  watermark = null,
  db = default_db
}) => {
  const rows = network_events.map(build_network_event_row)
  const updated_at = Math.round(Date.now() / 1000)
  let inserted_count = 0

  await db.transaction(async (trx) => {
    if (detector_states.length) {
      if (!detector_name) {
        throw new Error('detector_name is required to write detector state')
      }
      await trx('network_event_detector_state')
        .insert(
          detector_states.map(({ subject_key, detector_state }) => ({
            detector_name,
            subject_key,
            detector_state,
            updated_at
          }))
        )
        .onConflict(['detector_name', 'subject_key'])
        .merge(['detector_state', 'updated_at'])
    }

    if (watermark) {
      await trx('etl_state')
        .insert({
          table_name: watermark.table_name,
          last_max_ts: watermark.last_max_ts,
          completed_at: new Date()
        })
        .onConflict('table_name')
        .merge(['last_max_ts', 'completed_at'])
    }

    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const inserted = await trx('network_events')
        .insert(rows.slice(i, i + INSERT_BATCH_SIZE))
        .onConflict('network_event_id')
        .ignore()
        .returning('network_event_id')
      inserted_count += inserted.length
    }
  })

  return { inserted_count }
}

export default insert_network_events
