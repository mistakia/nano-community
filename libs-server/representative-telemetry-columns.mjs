import { epoch_seconds_sql } from '#libs-server/epoch-seconds.mjs'

// Every representatives_telemetry column but the two instants, which the API
// serves as epoch seconds under their long-standing response names
// (reported_at as telemetry_timestamp, observed_at as timestamp).
export const REPRESENTATIVE_TELEMETRY_VALUE_COLUMNS = [
  'account',
  'weight',
  'block_count',
  'block_behind',
  'cemented_count',
  'cemented_behind',
  'account_count',
  'unchecked_count',
  'bandwidth_cap',
  'peer_count',
  'protocol_version',
  'uptime',
  'major_version',
  'minor_version',
  'patch_version',
  'pre_release_version',
  'maker',
  'node_id',
  'address',
  'port'
]

export const REPRESENTATIVE_TELEMETRY_SELECT_SQL = [
  ...REPRESENTATIVE_TELEMETRY_VALUE_COLUMNS,
  epoch_seconds_sql('reported_at', 'telemetry_timestamp'),
  epoch_seconds_sql('observed_at', 'timestamp')
].join(', ')
