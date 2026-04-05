import { REPRESENTATIVE_COLUMN_IDS } from '#common/representative-table-columns.mjs'

const ids = REPRESENTATIVE_COLUMN_IDS

export const default_data_view_view_id = 'TELEMETRY_DEFAULT'

export const default_data_views = {
  TELEMETRY_DEFAULT: {
    view_id: 'TELEMETRY_DEFAULT',
    view_name: 'Default Telemetry',
    view_description: 'All representatives sorted by voting weight',
    table_state: {
      sort: [{ column_id: ids.WEIGHT, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.CONFS_BEHIND,
        ids.UPTIME,
        ids.VERSION,
        ids.BANDWIDTH_CAP,
        ids.PEER_COUNT,
        ids.PORT,
        ids.BLOCKS_BEHIND,
        ids.CEMENTED_COUNT,
        ids.BLOCK_COUNT,
        ids.UNCHECKED_COUNT,
        ids.LAST_SEEN,
        ids.COUNTRY,
        ids.ACCOUNT
      ],
      where: [],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_PRINCIPAL_REPS: {
    view_id: 'TELEMETRY_PRINCIPAL_REPS',
    view_name: 'Principal Representatives',
    view_description:
      'Representatives with >= 0.1% of online voting weight (protocol-defined principal representative threshold)',
    table_state: {
      sort: [{ column_id: ids.WEIGHT, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.CONFS_BEHIND,
        ids.UPTIME,
        ids.VERSION,
        ids.PEER_COUNT,
        ids.LAST_SEEN,
        ids.COUNTRY,
        ids.ASNAME
      ],
      where: [{ column_id: ids.WEIGHT_PCT, operator: '>=', value: 0.1 }],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_SYNC_STATUS: {
    view_id: 'TELEMETRY_SYNC_STATUS',
    view_name: 'Sync Status',
    view_description:
      'Representatives behind on confirmations, sorted by most behind first',
    table_state: {
      sort: [{ column_id: ids.CONFS_BEHIND, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.CONFS_BEHIND,
        ids.BLOCKS_BEHIND,
        ids.CEMENTED_COUNT,
        ids.BLOCK_COUNT,
        ids.UNCHECKED_COUNT,
        ids.VERSION,
        ids.LAST_SEEN
      ],
      where: [{ column_id: ids.CONFS_BEHIND, operator: '>', value: 0 }],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_UPTIME: {
    view_id: 'TELEMETRY_UPTIME',
    view_name: 'Uptime Leaders',
    view_description:
      'Representatives sorted by uptime for evaluating reliability',
    table_state: {
      sort: [{ column_id: ids.UPTIME, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.UPTIME,
        ids.CONFS_BEHIND,
        ids.VERSION,
        ids.LAST_SEEN,
        ids.COUNTRY
      ],
      where: [],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_OFFLINE: {
    view_id: 'TELEMETRY_OFFLINE',
    view_name: 'Offline Nodes',
    view_description:
      'Representatives currently offline, sorted by most recently seen',
    table_state: {
      sort: [{ column_id: ids.LAST_SEEN, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.LAST_SEEN,
        ids.UPTIME,
        ids.CONFS_BEHIND,
        ids.VERSION,
        ids.COUNTRY,
        ids.ACCOUNT
      ],
      where: [{ column_id: ids.STATUS, operator: '=', value: false }],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_OUTDATED: {
    view_id: 'TELEMETRY_OUTDATED',
    view_name: 'Outdated Nodes',
    view_description:
      'Representatives sorted by protocol version to identify nodes running old software',
    table_state: {
      sort: [{ column_id: ids.PROTOCOL_VERSION, desc: false }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.VERSION,
        ids.PROTOCOL_VERSION,
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.UPTIME,
        ids.CONFS_BEHIND,
        ids.LAST_SEEN
      ],
      where: [],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_GEOGRAPHIC: {
    view_id: 'TELEMETRY_GEOGRAPHIC',
    view_name: 'Geographic Distribution',
    view_description:
      'Representatives grouped by country and hosting provider for decentralization analysis',
    table_state: {
      sort: [{ column_id: ids.COUNTRY, desc: false }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.COUNTRY,
        ids.ASNAME,
        ids.WEIGHT,
        ids.WEIGHT_PCT,
        ids.ADDRESS,
        ids.PEER_COUNT,
        ids.UPTIME,
        ids.LAST_SEEN
      ],
      where: [],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_HARDWARE: {
    view_id: 'TELEMETRY_HARDWARE',
    view_name: 'Hardware Specs',
    view_description:
      'Node hardware information for representatives that report system specs',
    table_state: {
      sort: [{ column_id: ids.CPU_CORES, desc: true }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.CPU_MODEL,
        ids.CPU_CORES,
        ids.WATT_HOUR,
        ids.BANDWIDTH_CAP,
        ids.PEER_COUNT,
        ids.WEIGHT,
        ids.VERSION,
        ids.UPTIME
      ],
      where: [{ column_id: ids.CPU_MODEL, operator: 'IS NOT NULL' }],
      offset: 0,
      limit: 500
    }
  },

  TELEMETRY_CONNECTIVITY: {
    view_id: 'TELEMETRY_CONNECTIVITY',
    view_name: 'Network Connectivity',
    view_description:
      'Peer connections and bandwidth sorted by peer count to identify connectivity issues',
    table_state: {
      sort: [{ column_id: ids.PEER_COUNT, desc: false }],
      prefix_columns: [ids.ALIAS],
      columns: [
        ids.PEER_COUNT,
        ids.BANDWIDTH_CAP,
        ids.PORT,
        ids.ADDRESS,
        ids.WEIGHT,
        ids.CONFS_BEHIND,
        ids.VERSION,
        ids.LAST_SEEN
      ],
      where: [{ column_id: ids.PEER_COUNT, operator: 'IS NOT NULL' }],
      offset: 0,
      limit: 500
    }
  }
}
