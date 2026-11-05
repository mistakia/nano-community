import debug from 'debug'

import default_db from '#db'
import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'
import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'
import {
  REPRESENTATIVE_TELEMETRY_SETTLE_SECONDS,
  load_representative_telemetry,
  group_telemetry_by_timestamp,
  get_full_window_timestamps,
  summarize_representative_window,
  get_majority_major_version_by_maker
} from '#libs-server/network-events/summarize-representative-telemetry.mjs'

const log = debug('detect-telemetry-network-events')

// Names both the detector state and the etl_state watermark row.
export const DETECTOR_NAME = 'detect-telemetry-network-events'

// Catch-up bound per run: one day of 5-minute snapshots. A longer backlog
// drains over the following runs.
const MAX_SNAPSHOTS_PER_RUN = 288

const open_condition = ({
  representative_state,
  network_event_type,
  began_at,
  identity = {},
  evidence,
  is_first_run,
  representative_account
}) => {
  representative_state.open[network_event_type] = { began_at, ...identity }
  return {
    network_event_type,
    network_event_phase: 'began',
    representative_account,
    evidence: {
      ...evidence,
      ...identity,
      began_at,
      ...(is_first_run ? { first_observation: true } : {})
    },
    observed_at: began_at
  }
}

const close_condition = ({
  representative_state,
  network_event_type,
  ended_at,
  evidence,
  representative_account
}) => {
  const opened = representative_state.open[network_event_type]
  delete representative_state.open[network_event_type]
  return {
    network_event_type,
    network_event_phase: 'ended',
    representative_account,
    // the began keys win, so the ended id links to its began row
    evidence: { ...evidence, ...opened },
    observed_at: ended_at
  }
}

// Applies one condition flag (true, false, or null for a mixed window) to the
// representative's open conditions.
const apply_condition = ({
  representative_state,
  network_event_type,
  holds,
  summary,
  identity,
  evidence,
  is_first_run
}) => {
  const is_open = Boolean(representative_state.open[network_event_type])
  if (holds === true && !is_open) {
    return open_condition({
      representative_state,
      network_event_type,
      began_at: summary.window_start,
      identity,
      evidence,
      is_first_run,
      representative_account: summary.representative_account
    })
  }
  if (holds === false && is_open) {
    return close_condition({
      representative_state,
      network_event_type,
      ended_at: summary.window_start,
      evidence,
      representative_account: summary.representative_account
    })
  }
  return null
}

// A settled value that differs from the prior settled value is an occurrence.
// The first sighting of a representative only seeds its state.
const apply_settled_change = ({
  representative_state,
  state_key,
  settled_value,
  build_event,
  is_first_run
}) => {
  if (settled_value === null) return null
  const previous_value = representative_state[state_key]
  representative_state[state_key] = settled_value
  if (is_first_run || !previous_value || previous_value === settled_value) {
    return null
  }
  return build_event(previous_value)
}

export const detect_representative_events = ({
  summary,
  representative_state,
  majority_major_version_by_maker,
  is_first_run
}) => {
  const window_evidence = {
    window_start: summary.window_start,
    window_end: summary.window_end,
    snapshot_count: summary.snapshot_count
  }

  const majority_major_version =
    summary.settled_maker === null
      ? undefined
      : majority_major_version_by_maker.get(summary.settled_maker)
  const is_version_outdated =
    summary.settled_major_version === null ||
    majority_major_version === undefined
      ? null
      : summary.settled_major_version < majority_major_version

  const network_events = [
    apply_condition({
      representative_state,
      network_event_type: 'representative_multiple_peer_addresses',
      holds: summary.has_multiple_peer_addresses,
      summary,
      evidence: {
        ...window_evidence,
        peer_addresses: summary.peer_addresses,
        node_ids: summary.node_ids
      },
      is_first_run
    }),
    apply_settled_change({
      representative_state,
      state_key: 'peer_address',
      settled_value: summary.settled_peer_address,
      is_first_run,
      build_event: (previous_peer_address) => ({
        network_event_type: 'representative_peer_address_changed',
        network_event_phase: 'occurred',
        representative_account: summary.representative_account,
        peer_address: summary.settled_peer_address,
        node_id: summary.settled_node_id,
        evidence: { ...window_evidence, previous_peer_address },
        observed_at: summary.window_start
      })
    }),
    apply_settled_change({
      representative_state,
      state_key: 'node_id',
      settled_value: summary.settled_node_id,
      is_first_run,
      build_event: (previous_node_id) => ({
        network_event_type: 'representative_node_changed',
        network_event_phase: 'occurred',
        representative_account: summary.representative_account,
        peer_address: summary.settled_peer_address,
        node_id: summary.settled_node_id,
        evidence: { ...window_evidence, previous_node_id },
        observed_at: summary.window_start
      })
    }),
    apply_condition({
      representative_state,
      network_event_type: 'representative_version_outdated',
      holds: is_version_outdated,
      summary,
      identity: {
        maker: summary.settled_maker,
        major_version: summary.settled_major_version
      },
      evidence: {
        ...window_evidence,
        settled_major_version: summary.settled_major_version,
        majority_major_version
      },
      is_first_run
    }),
    apply_condition({
      representative_state,
      network_event_type: 'representative_cemented_behind',
      holds: summary.is_cemented_behind,
      summary,
      evidence: {
        ...window_evidence,
        cemented_behind: summary.cemented_behind_per_snapshot
      },
      is_first_run
    })
  ]

  return network_events.filter(Boolean)
}

const load_detector_states = async ({ db }) => {
  const rows = await db('network_event_detector_state').where({
    detector_name: DETECTOR_NAME
  })
  return new Map(rows.map((row) => [row.subject_key, row.detector_state]))
}

const list_snapshot_timestamps = async ({ db, watermark }) => {
  if (watermark === null) {
    const latest = await db('representatives_telemetry')
      .max('timestamp as timestamp')
      .whereNotNull('account')
      .first()
    return latest?.timestamp ? [latest.timestamp] : []
  }
  const rows = await db('representatives_telemetry')
    .distinct('timestamp')
    .whereNotNull('account')
    .where('timestamp', '>', watermark)
    .orderBy('timestamp', 'asc')
    .limit(MAX_SNAPSHOTS_PER_RUN)
  return rows.map((row) => row.timestamp)
}

// Evaluates every snapshot after the watermark. The first run (no watermark)
// evaluates only the latest snapshot: it seeds state, emits conditions already
// present with first_observation, and emits no changed events.
export const detect_telemetry_network_events = async ({
  db = default_db,
  dry_run = false
} = {}) => {
  const watermark_row = await db('etl_state')
    .where({ table_name: DETECTOR_NAME })
    .first()
  const watermark = watermark_row?.last_max_ts ?? null
  const is_first_run = watermark === null

  const target_timestamps = await list_snapshot_timestamps({ db, watermark })
  if (!target_timestamps.length) {
    log('no new telemetry snapshots')
    return { network_events: [], evaluated_count: 0, inserted_count: 0 }
  }

  const rows = await load_representative_telemetry({
    db,
    after_timestamp:
      target_timestamps[0] - REPRESENTATIVE_TELEMETRY_SETTLE_SECONDS,
    through_timestamp: target_timestamps[target_timestamps.length - 1]
  })
  const rows_by_timestamp = group_telemetry_by_timestamp(rows)
  const snapshot_timestamps = [...rows_by_timestamp.keys()].sort(
    (a, b) => a - b
  )

  const detector_states = await load_detector_states({ db })
  const changed_subject_keys = new Set()
  const network_events = []
  let evaluated_count = 0

  for (const window_end of target_timestamps) {
    const window_timestamps = get_full_window_timestamps({
      snapshot_timestamps,
      window_end
    })
    if (!window_timestamps) {
      log(`window ending ${window_end} is not full, skipping`)
      continue
    }
    evaluated_count += 1

    const majority_major_version_by_maker = get_majority_major_version_by_maker(
      rows_by_timestamp.get(window_end)
    )
    const summaries = summarize_representative_window({
      rows_by_timestamp,
      window_timestamps
    })

    for (const summary of summaries) {
      const subject_key = summary.representative_account
      const representative_state = detector_states.get(subject_key) || {
        open: {}
      }
      const state_before = JSON.stringify(representative_state)
      network_events.push(
        ...detect_representative_events({
          summary,
          representative_state,
          majority_major_version_by_maker,
          is_first_run
        })
      )
      if (JSON.stringify(representative_state) !== state_before) {
        detector_states.set(subject_key, representative_state)
        changed_subject_keys.add(subject_key)
      }
    }
  }

  // A first run without a full window writes nothing, so the next run retries.
  if (is_first_run && !evaluated_count) {
    log('first run has no full settle window yet')
    return { network_events, evaluated_count, inserted_count: 0 }
  }

  if (dry_run) {
    return { network_events, evaluated_count, inserted_count: 0 }
  }

  const { inserted_count } = await insert_network_events({
    db,
    network_events,
    detector_name: DETECTOR_NAME,
    detector_states: [...changed_subject_keys].map((subject_key) => ({
      subject_key,
      detector_state: detector_states.get(subject_key)
    })),
    watermark: {
      table_name: DETECTOR_NAME,
      last_max_ts: target_timestamps[target_timestamps.length - 1]
    }
  })

  log(
    `evaluated ${evaluated_count} snapshots, inserted ${inserted_count} of ${network_events.length} events`
  )
  return { network_events, evaluated_count, inserted_count }
}

if (isMain(import.meta.url)) {
  debug.enable('detect-telemetry-network-events')
  const main = async () => {
    const dry_run = process.argv.includes('--dry-run')
    const start_time = Date.now()
    let error
    try {
      const { network_events } = await detect_telemetry_network_events({
        dry_run
      })
      if (dry_run) console.log(JSON.stringify(network_events, null, 2))
    } catch (err) {
      error = err
      console.log(err)
    }

    if (!dry_run) {
      await report_job({
        job_id: 'nano-community-detect-telemetry-network-events',
        success: !error,
        reason: error ? error.message : null,
        duration_ms: Date.now() - start_time
      })
    }

    process.exit(error ? 1 : 0)
  }

  main()
}

export default detect_telemetry_network_events
