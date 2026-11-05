import { REPRESENTATIVE_TELEMETRY_SETTLE_MINUTES } from '#common/network-event-types.mjs'
import { is_representative_cemented_behind } from '#common/representative-alert-rules.mjs'

export const REPRESENTATIVE_TELEMETRY_SETTLE_SECONDS =
  REPRESENTATIVE_TELEMETRY_SETTLE_MINUTES * 60

// The collector runs every 5 minutes. A window whose snapshots leave a larger
// gap (a collector outage) is not full, so nothing settles inside it.
const MAX_SNAPSHOT_GAP_SECONDS = 600

const trim = (value) => (typeof value === 'string' ? value.trim() : value)

export const load_representative_telemetry = ({
  db,
  after_timestamp,
  through_timestamp
}) =>
  db('representatives_telemetry')
    .select(
      'account',
      'address',
      'node_id',
      'maker',
      'major_version',
      'cemented_behind',
      'weight',
      'timestamp'
    )
    .whereNotNull('account')
    .where('timestamp', '>', after_timestamp)
    .where('timestamp', '<=', through_timestamp)
    .orderBy('timestamp', 'asc')
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        account: trim(row.account),
        address: trim(row.address),
        node_id: trim(row.node_id),
        maker: String(trim(row.maker))
      }))
    )

export const group_telemetry_by_timestamp = (rows) => {
  const rows_by_timestamp = new Map()
  for (const row of rows) {
    if (!rows_by_timestamp.has(row.timestamp)) {
      rows_by_timestamp.set(row.timestamp, [])
    }
    rows_by_timestamp.get(row.timestamp).push(row)
  }
  return rows_by_timestamp
}

// Snapshot timestamps in the settle window ending at window_end, or null when
// the snapshots do not cover the whole window.
export const get_full_window_timestamps = ({
  snapshot_timestamps,
  window_end
}) => {
  const window_start_bound =
    window_end - REPRESENTATIVE_TELEMETRY_SETTLE_SECONDS
  const window_timestamps = snapshot_timestamps.filter(
    (timestamp) => timestamp > window_start_bound && timestamp <= window_end
  )
  if (!window_timestamps.length) return null
  if (window_timestamps[0] - window_start_bound > MAX_SNAPSHOT_GAP_SECONDS) {
    return null
  }
  for (let i = 1; i < window_timestamps.length; i++) {
    if (
      window_timestamps[i] - window_timestamps[i - 1] >
      MAX_SNAPSHOT_GAP_SECONDS
    ) {
      return null
    }
  }
  return window_timestamps
}

// The single value present in every snapshot, or null when a snapshot holds
// several values or the value changes inside the window.
const get_settled_value = (values_per_snapshot) => {
  const [first] = values_per_snapshot
  if (!first || first.size !== 1) return null
  const [value] = first
  const is_settled = values_per_snapshot.every(
    (values) => values.size === 1 && values.has(value)
  )
  return is_settled ? value : null
}

// true when the predicate holds in every snapshot, false when it fails in
// every snapshot, and null when the window is mixed.
const get_window_flag = (flags) => {
  if (flags.every(Boolean)) return true
  if (flags.every((flag) => !flag)) return false
  return null
}

// Per representative present in every snapshot of the window: its settled
// fields and the condition flags the detectors act on.
export const summarize_representative_window = ({
  rows_by_timestamp,
  window_timestamps
}) => {
  const snapshots_by_account = new Map()
  for (const timestamp of window_timestamps) {
    for (const row of rows_by_timestamp.get(timestamp) || []) {
      if (!snapshots_by_account.has(row.account)) {
        snapshots_by_account.set(row.account, new Map())
      }
      const snapshots = snapshots_by_account.get(row.account)
      if (!snapshots.has(timestamp)) snapshots.set(timestamp, [])
      snapshots.get(timestamp).push(row)
    }
  }

  const summaries = []
  for (const [representative_account, snapshots] of snapshots_by_account) {
    if (snapshots.size !== window_timestamps.length) continue

    const snapshot_rows = window_timestamps.map((timestamp) =>
      snapshots.get(timestamp)
    )
    const addresses_per_snapshot = snapshot_rows.map(
      (rows) => new Set(rows.map((row) => row.address))
    )
    const node_ids_per_snapshot = snapshot_rows.map(
      (rows) => new Set(rows.map((row) => row.node_id))
    )
    const versions_per_snapshot = snapshot_rows.map(
      (rows) => new Set(rows.map((row) => `${row.maker}:${row.major_version}`))
    )
    // A representative with several nodes is as current as its best node.
    const cemented_behind_per_snapshot = snapshot_rows.map((rows) =>
      Math.min(...rows.map((row) => Number(row.cemented_behind)))
    )

    const settled_version = get_settled_value(versions_per_snapshot)
    const [settled_maker, settled_major_version] = settled_version
      ? settled_version.split(':')
      : [null, null]

    summaries.push({
      representative_account,
      window_start: window_timestamps[0],
      window_end: window_timestamps[window_timestamps.length - 1],
      snapshot_count: window_timestamps.length,
      peer_addresses: [
        ...new Set(addresses_per_snapshot.flatMap((s) => [...s]))
      ].sort(),
      node_ids: [
        ...new Set(node_ids_per_snapshot.flatMap((s) => [...s]))
      ].sort(),
      addresses_in_every_snapshot: [...addresses_per_snapshot[0]]
        .filter((address) =>
          addresses_per_snapshot.every((addresses) => addresses.has(address))
        )
        .sort(),
      has_multiple_peer_addresses: get_window_flag(
        addresses_per_snapshot.map((addresses) => addresses.size > 1)
      ),
      settled_peer_address: get_settled_value(addresses_per_snapshot),
      settled_node_id: get_settled_value(node_ids_per_snapshot),
      settled_maker,
      settled_major_version:
        settled_major_version === null ? null : Number(settled_major_version),
      cemented_behind_per_snapshot,
      is_cemented_behind: get_window_flag(
        cemented_behind_per_snapshot.map(is_representative_cemented_behind)
      )
    })
  }
  return summaries
}

// Per maker, the major version holding the greatest summed weight in one
// snapshot. Major versions only compare within a maker.
export const get_majority_major_version_by_maker = (snapshot_rows) => {
  const seen_accounts = new Set()
  const weight_by_maker = new Map()
  for (const row of snapshot_rows) {
    if (seen_accounts.has(row.account)) continue
    seen_accounts.add(row.account)
    if (!weight_by_maker.has(row.maker))
      weight_by_maker.set(row.maker, new Map())
    const weight_by_major = weight_by_maker.get(row.maker)
    weight_by_major.set(
      row.major_version,
      (weight_by_major.get(row.major_version) || 0) + (Number(row.weight) || 0)
    )
  }

  const majority_by_maker = new Map()
  for (const [maker, weight_by_major] of weight_by_maker) {
    let majority = null
    for (const [major_version, weight] of weight_by_major) {
      if (majority === null || weight > majority.weight) {
        majority = { major_version, weight }
      }
    }
    majority_by_maker.set(maker, majority.major_version)
  }
  return majority_by_maker
}
