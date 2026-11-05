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
  summarize_representative_window
} from '#libs-server/network-events/summarize-representative-telemetry.mjs'

const log = debug('probe-representative-rpc')

export const DETECTOR_NAME = 'probe-representative-rpc'
const NETWORK_EVENT_TYPE = 'representative_rpc_control_enabled'

const RPC_PORT = 7076
const PROBE_TIMEOUT_MS = 3000
const PROBE_CONCURRENCY = 8
const PROBE_USER_AGENT =
  'nano.community representative RPC probe (+https://nano.community)'

// A node with enable_control off refuses control actions with this error.
const CONTROL_DISABLED_ERROR = /rpc control is disabled/i

export const RPC_PROBE_RESULTS = {
  control_enabled: 'control_enabled',
  control_disabled: 'control_disabled',
  unreachable: 'unreachable',
  unknown: 'unknown'
}

const IPV4_MAPPED_RE = /^::ffff:([0-9.]+)$/i

export const build_rpc_url = (peer_address, port = RPC_PORT) => {
  const ipv4 = IPV4_MAPPED_RE.exec(peer_address)?.[1]
  if (ipv4) return `http://${ipv4}:${port}`
  if (peer_address.includes(':')) return `http://[${peer_address}]:${port}`
  return `http://${peer_address}:${port}`
}

const post_rpc_action = async ({ url, action, timeout_ms }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': PROBE_USER_AGENT
    },
    body: JSON.stringify({ action }),
    signal: AbortSignal.timeout(timeout_ms)
  })
  return response.json()
}

// Calls the read-only version action, then work_peers, which a node only
// answers with RPC control enabled.
export const probe_rpc_address = async ({
  peer_address,
  url = build_rpc_url(peer_address),
  timeout_ms = PROBE_TIMEOUT_MS
}) => {
  let version
  try {
    version = await post_rpc_action({ url, action: 'version', timeout_ms })
  } catch (error) {
    return {
      peer_address,
      url,
      result: RPC_PROBE_RESULTS.unreachable,
      error: error.name === 'TimeoutError' ? 'timeout' : error.message
    }
  }

  const node_vendor = version?.node_vendor || null
  try {
    const work_peers = await post_rpc_action({
      url,
      action: 'work_peers',
      timeout_ms
    })
    if (work_peers && 'work_peers' in work_peers && !work_peers.error) {
      return {
        peer_address,
        url,
        node_vendor,
        result: RPC_PROBE_RESULTS.control_enabled
      }
    }
    const error =
      typeof work_peers?.error === 'string' ? work_peers.error : null
    return {
      peer_address,
      url,
      node_vendor,
      result:
        error && CONTROL_DISABLED_ERROR.test(error)
          ? RPC_PROBE_RESULTS.control_disabled
          : RPC_PROBE_RESULTS.unknown,
      error
    }
  } catch (error) {
    return {
      peer_address,
      url,
      node_vendor,
      result: RPC_PROBE_RESULTS.unknown,
      error: error.name === 'TimeoutError' ? 'timeout' : error.message
    }
  }
}

// true when any address answers a control action, false when every address
// refuses control or is unreachable, null when an answer was ambiguous.
export const is_rpc_control_enabled = (address_results) => {
  if (
    address_results.some(
      ({ result }) => result === RPC_PROBE_RESULTS.control_enabled
    )
  ) {
    return true
  }
  if (
    address_results.some(({ result }) => result === RPC_PROBE_RESULTS.unknown)
  ) {
    return null
  }
  return false
}

const map_with_concurrency = async (items, concurrency, fn) => {
  const results = new Array(items.length)
  let next_index = 0
  const worker = async () => {
    while (next_index < items.length) {
      const index = next_index++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  )
  return results
}

// Each representative's addresses present in every snapshot of the latest
// settle window.
const load_settled_representative_addresses = async ({ db }) => {
  const latest = await db('representatives_telemetry')
    .max('timestamp as timestamp')
    .whereNotNull('account')
    .first()
  if (!latest?.timestamp) return []

  const rows = await load_representative_telemetry({
    db,
    after_timestamp: latest.timestamp - REPRESENTATIVE_TELEMETRY_SETTLE_SECONDS,
    through_timestamp: latest.timestamp
  })
  const rows_by_timestamp = group_telemetry_by_timestamp(rows)
  const window_timestamps = get_full_window_timestamps({
    snapshot_timestamps: [...rows_by_timestamp.keys()].sort((a, b) => a - b),
    window_end: latest.timestamp
  })
  if (!window_timestamps) return []

  return summarize_representative_window({
    rows_by_timestamp,
    window_timestamps
  })
    .filter((summary) => summary.addresses_in_every_snapshot.length)
    .map((summary) => ({
      representative_account: summary.representative_account,
      peer_addresses: summary.addresses_in_every_snapshot
    }))
}

// Emits began and ended on change against detector state. The first run (no
// state for this detector) emits present conditions with first_observation.
export const probe_representative_rpc = async ({
  db = default_db,
  dry_run = false,
  probe_address = probe_rpc_address,
  now = Math.round(Date.now() / 1000)
} = {}) => {
  const representatives = await load_settled_representative_addresses({ db })
  if (!representatives.length) {
    log('no representative has a settled address')
    return { network_events: [], probed_count: 0, inserted_count: 0 }
  }

  const state_rows = await db('network_event_detector_state').where({
    detector_name: DETECTOR_NAME
  })
  const is_first_run = !state_rows.length
  const detector_states = new Map(
    state_rows.map((row) => [row.subject_key, row.detector_state])
  )

  const address_results = await map_with_concurrency(
    representatives.flatMap(({ representative_account, peer_addresses }) =>
      peer_addresses.map((peer_address) => ({
        representative_account,
        peer_address
      }))
    ),
    PROBE_CONCURRENCY,
    async ({ representative_account, peer_address }) => ({
      representative_account,
      ...(await probe_address({ peer_address }))
    })
  )

  const network_events = []
  const changed_states = []
  for (const { representative_account } of representatives) {
    const results = address_results
      .filter(
        (result) => result.representative_account === representative_account
      )
      .map(({ representative_account, ...result }) => result)
    const holds = is_rpc_control_enabled(results)
    const previous_state = detector_states.get(representative_account)
    const representative_state = previous_state
      ? structuredClone(previous_state)
      : { open: {} }
    const opened = representative_state.open[NETWORK_EVENT_TYPE]
    const evidence = { probed_at: now, addresses: results }

    if (holds === true && !opened) {
      representative_state.open[NETWORK_EVENT_TYPE] = { began_at: now }
      network_events.push({
        network_event_type: NETWORK_EVENT_TYPE,
        network_event_phase: 'began',
        representative_account,
        peer_address: results.find(
          ({ result }) => result === RPC_PROBE_RESULTS.control_enabled
        ).peer_address,
        evidence: {
          ...evidence,
          began_at: now,
          ...(is_first_run ? { first_observation: true } : {})
        },
        observed_at: now
      })
    } else if (holds === false && opened) {
      delete representative_state.open[NETWORK_EVENT_TYPE]
      network_events.push({
        network_event_type: NETWORK_EVENT_TYPE,
        network_event_phase: 'ended',
        representative_account,
        evidence: { ...evidence, ...opened },
        observed_at: now
      })
    }

    if (
      JSON.stringify(representative_state) !== JSON.stringify(previous_state)
    ) {
      changed_states.push({
        subject_key: representative_account,
        detector_state: representative_state
      })
    }
  }

  if (dry_run) {
    return {
      network_events,
      probed_count: address_results.length,
      inserted_count: 0
    }
  }

  const { inserted_count } = await insert_network_events({
    db,
    network_events,
    detector_name: DETECTOR_NAME,
    detector_states: changed_states
  })
  log(
    `probed ${address_results.length} addresses, inserted ${inserted_count} events`
  )
  return {
    network_events,
    probed_count: address_results.length,
    inserted_count
  }
}

if (isMain(import.meta.url)) {
  debug.enable('probe-representative-rpc')
  const main = async () => {
    const dry_run = process.argv.includes('--dry-run')
    const start_time = Date.now()
    let error
    try {
      const { network_events } = await probe_representative_rpc({ dry_run })
      if (dry_run) console.log(JSON.stringify(network_events, null, 2))
    } catch (err) {
      error = err
      console.log(err)
    }

    if (!dry_run) {
      await report_job({
        job_id: 'nano-community-probe-representative-rpc',
        success: !error,
        reason: error ? error.message : null,
        duration_ms: Date.now() - start_time
      })
    }

    process.exit(error ? 1 : 0)
  }

  main()
}

export default probe_representative_rpc
