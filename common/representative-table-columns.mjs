/**
 * Shared column definitions for representative/telemetry data views.
 * Used by both backend (filtering/sorting) and frontend (react-table column config).
 */

// react-table TABLE_DATA_TYPES values (from @mistakia/react-table constants)
const DATA_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  BOOLEAN: 4
}

export const REPRESENTATIVE_COLUMN_IDS = {
  STATUS: 'status',
  ALIAS: 'alias',
  ACCOUNT: 'account',
  WEIGHT: 'weight',
  WEIGHT_PCT: 'weight_pct',
  CONFS_BEHIND: 'confs_behind',
  UPTIME: 'uptime',
  VERSION: 'version',
  BANDWIDTH_CAP: 'bandwidth_cap',
  PEER_COUNT: 'peer_count',
  PORT: 'port',
  BLOCKS_BEHIND: 'blocks_behind',
  CEMENTED_COUNT: 'cemented_count',
  BLOCK_COUNT: 'block_count',
  UNCHECKED_COUNT: 'unchecked_count',
  CPU_CORES: 'cpu_cores',
  CPU_MODEL: 'cpu_model',
  WATT_HOUR: 'watt_hour',
  PROTOCOL_VERSION: 'protocol_version',
  LAST_SEEN: 'last_seen',
  ASNAME: 'asname',
  COUNTRY: 'country',
  ADDRESS: 'address'
}

export const REPRESENTATIVE_COLUMN_DATA_TYPES = {
  [REPRESENTATIVE_COLUMN_IDS.STATUS]: DATA_TYPES.BOOLEAN,
  [REPRESENTATIVE_COLUMN_IDS.ALIAS]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.ACCOUNT]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.WEIGHT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.CONFS_BEHIND]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.UPTIME]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.VERSION]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.PEER_COUNT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.PORT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.BLOCKS_BEHIND]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.CEMENTED_COUNT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.BLOCK_COUNT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.UNCHECKED_COUNT]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.CPU_CORES]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.CPU_MODEL]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.WATT_HOUR]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.PROTOCOL_VERSION]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.LAST_SEEN]: DATA_TYPES.NUMBER,
  [REPRESENTATIVE_COLUMN_IDS.ASNAME]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.COUNTRY]: DATA_TYPES.TEXT,
  [REPRESENTATIVE_COLUMN_IDS.ADDRESS]: DATA_TYPES.TEXT
}

/**
 * Extract a column value from a representative row object.
 * Handles nested data access (telemetry, account_meta, network, representative_meta).
 *
 * Note: weight_pct is a derived field that must be pre-computed on the row
 * before calling this function (requires total_weight/quorum_total context).
 */
export function get_representative_value(row, column_id) {
  switch (column_id) {
    case REPRESENTATIVE_COLUMN_IDS.STATUS:
      return row.is_online

    case REPRESENTATIVE_COLUMN_IDS.ALIAS:
      return row.alias

    case REPRESENTATIVE_COLUMN_IDS.ACCOUNT:
      return row.account

    case REPRESENTATIVE_COLUMN_IDS.WEIGHT:
      return row.account_meta ? row.account_meta.weight : null

    case REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT:
      return row.weight_pct != null ? row.weight_pct : null

    case REPRESENTATIVE_COLUMN_IDS.CONFS_BEHIND:
      return row.telemetry ? row.telemetry.cemented_behind : null

    case REPRESENTATIVE_COLUMN_IDS.UPTIME:
      return (row.last_online || 0) - (row.last_offline || 0)

    case REPRESENTATIVE_COLUMN_IDS.VERSION:
      return row.version

    case REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP:
      return row.telemetry ? row.telemetry.bandwidth_cap : null

    case REPRESENTATIVE_COLUMN_IDS.PEER_COUNT:
      return row.telemetry ? row.telemetry.peer_count : null

    case REPRESENTATIVE_COLUMN_IDS.PORT:
      return row.telemetry ? row.telemetry.port : null

    case REPRESENTATIVE_COLUMN_IDS.BLOCKS_BEHIND:
      return row.telemetry ? row.telemetry.block_behind : null

    case REPRESENTATIVE_COLUMN_IDS.CEMENTED_COUNT:
      return row.telemetry ? row.telemetry.cemented_count : null

    case REPRESENTATIVE_COLUMN_IDS.BLOCK_COUNT:
      return row.telemetry ? row.telemetry.block_count : null

    case REPRESENTATIVE_COLUMN_IDS.UNCHECKED_COUNT:
      return row.telemetry ? row.telemetry.unchecked_count : null

    case REPRESENTATIVE_COLUMN_IDS.CPU_CORES:
      return row.representative_meta ? row.representative_meta.cpu_cores : null

    case REPRESENTATIVE_COLUMN_IDS.CPU_MODEL:
      return row.representative_meta ? row.representative_meta.cpu_model : null

    case REPRESENTATIVE_COLUMN_IDS.WATT_HOUR:
      return row.watt_hour

    case REPRESENTATIVE_COLUMN_IDS.PROTOCOL_VERSION:
      return row.telemetry ? row.telemetry.protocol_version : null

    case REPRESENTATIVE_COLUMN_IDS.LAST_SEEN:
      return row.last_seen

    case REPRESENTATIVE_COLUMN_IDS.ASNAME:
      return row.network ? row.network.asname : null

    case REPRESENTATIVE_COLUMN_IDS.COUNTRY:
      return row.network ? row.network.country : null

    case REPRESENTATIVE_COLUMN_IDS.ADDRESS:
      return row.telemetry ? row.telemetry.address : null

    default:
      return row[column_id]
  }
}

export const REPRESENTATIVE_COLUMN_GROUPS = {
  IDENTITY: {
    group_id: 'identity',
    group_label: 'Identity',
    columns: [
      REPRESENTATIVE_COLUMN_IDS.ALIAS,
      REPRESENTATIVE_COLUMN_IDS.ACCOUNT
    ]
  },
  NETWORK_WEIGHT: {
    group_id: 'network_weight',
    group_label: 'Network Weight',
    columns: [
      REPRESENTATIVE_COLUMN_IDS.WEIGHT,
      REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT
    ]
  },
  TELEMETRY: {
    group_id: 'telemetry',
    group_label: 'Telemetry',
    columns: [
      REPRESENTATIVE_COLUMN_IDS.STATUS,
      REPRESENTATIVE_COLUMN_IDS.CONFS_BEHIND,
      REPRESENTATIVE_COLUMN_IDS.UPTIME,
      REPRESENTATIVE_COLUMN_IDS.VERSION,
      REPRESENTATIVE_COLUMN_IDS.BANDWIDTH_CAP,
      REPRESENTATIVE_COLUMN_IDS.PEER_COUNT,
      REPRESENTATIVE_COLUMN_IDS.PORT,
      REPRESENTATIVE_COLUMN_IDS.BLOCKS_BEHIND,
      REPRESENTATIVE_COLUMN_IDS.CEMENTED_COUNT,
      REPRESENTATIVE_COLUMN_IDS.BLOCK_COUNT,
      REPRESENTATIVE_COLUMN_IDS.UNCHECKED_COUNT,
      REPRESENTATIVE_COLUMN_IDS.PROTOCOL_VERSION,
      REPRESENTATIVE_COLUMN_IDS.LAST_SEEN,
      REPRESENTATIVE_COLUMN_IDS.ADDRESS
    ]
  },
  SYSTEM: {
    group_id: 'system',
    group_label: 'System',
    columns: [
      REPRESENTATIVE_COLUMN_IDS.CPU_CORES,
      REPRESENTATIVE_COLUMN_IDS.CPU_MODEL,
      REPRESENTATIVE_COLUMN_IDS.WATT_HOUR
    ]
  },
  LOCATION: {
    group_id: 'location',
    group_label: 'Location',
    columns: [
      REPRESENTATIVE_COLUMN_IDS.ASNAME,
      REPRESENTATIVE_COLUMN_IDS.COUNTRY
    ]
  }
}
