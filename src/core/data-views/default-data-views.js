import { REPRESENTATIVE_COLUMN_IDS } from '#common/representative-table-columns.mjs'

export const default_data_view_view_id = 'TELEMETRY_DEFAULT'

export const default_data_views = {
  [default_data_view_view_id]: {
    view_id: default_data_view_view_id,
    view_name: 'Default Telemetry',
    view_description: 'Default telemetry data view',
    table_state: {
      sort: [{ column_id: REPRESENTATIVE_COLUMN_IDS.WEIGHT, desc: true }],
      prefix_columns: [
        REPRESENTATIVE_COLUMN_IDS.ALIAS
      ],
      columns: [
        REPRESENTATIVE_COLUMN_IDS.WEIGHT,
        REPRESENTATIVE_COLUMN_IDS.WEIGHT_PCT,
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
        REPRESENTATIVE_COLUMN_IDS.LAST_SEEN,
        REPRESENTATIVE_COLUMN_IDS.COUNTRY,
        REPRESENTATIVE_COLUMN_IDS.ACCOUNT
      ],
      where: [],
      offset: 0,
      limit: 500
    }
  }
}
