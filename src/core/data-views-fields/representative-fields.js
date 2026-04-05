import React from 'react'
import { Link } from 'react-router-dom'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

import Uptime from '@components/uptime'
import { timeago } from '@core/utils'
import { REPRESENTATIVE_COLUMN_IDS } from '#common/representative-table-columns.mjs'
import * as table_constants from 'react-table/src/constants.mjs'

const COLUMN_GROUPS = {
  IDENTITY: {
    column_group_id: 'IDENTITY',
    priority: 1
  },
  NETWORK_WEIGHT: {
    column_group_id: 'NETWORK_WEIGHT',
    priority: 1
  },
  TELEMETRY: {
    column_group_id: 'TELEMETRY',
    priority: 1
  },
  SYSTEM: {
    column_group_id: 'SYSTEM',
    priority: 2
  },
  LOCATION: {
    column_group_id: 'LOCATION',
    priority: 2
  }
}

const StatusCell = React.memo(({ row }) => (
  <Uptime data={row.original._uptime_data || []} length={1} />
))
StatusCell.displayName = 'StatusCell'

const AccountCell = React.memo(({ value }) => (
  <Link to={`/${value}`}>{value}</Link>
))
AccountCell.displayName = 'AccountCell'

const UptimeCell = React.memo(({ row }) => (
  <Uptime data={row.original._uptime_data || []} length={25} />
))
UptimeCell.displayName = 'UptimeCell'

const LastSeenCell = React.memo(({ row }) =>
  row.original._is_online ? (
    <FiberManualRecordIcon className='green' />
  ) : row.original.last_seen ? (
    timeago.format(row.original.last_seen * 1000, 'nano_short')
  ) : null
)
LastSeenCell.displayName = 'LastSeenCell'

const number_operators = [
  table_constants.TABLE_OPERATORS.EQUAL,
  table_constants.TABLE_OPERATORS.NOT_EQUAL,
  table_constants.TABLE_OPERATORS.GREATER_THAN,
  table_constants.TABLE_OPERATORS.GREATER_THAN_OR_EQUAL,
  table_constants.TABLE_OPERATORS.LESS_THAN,
  table_constants.TABLE_OPERATORS.LESS_THAN_OR_EQUAL,
  table_constants.TABLE_OPERATORS.IS_NULL,
  table_constants.TABLE_OPERATORS.IS_NOT_NULL
]

const text_operators = [
  table_constants.TABLE_OPERATORS.EQUAL,
  table_constants.TABLE_OPERATORS.NOT_EQUAL,
  table_constants.TABLE_OPERATORS.LIKE,
  table_constants.TABLE_OPERATORS.NOT_LIKE,
  table_constants.TABLE_OPERATORS.IS_NULL,
  table_constants.TABLE_OPERATORS.IS_NOT_NULL
]

const ids = REPRESENTATIVE_COLUMN_IDS

export default function get_representative_fields() {
  const fields = {
    [ids.STATUS]: {
      column_title: 'Status',
      header_label: '',
      size: 36,
      data_type: table_constants.TABLE_DATA_TYPES.BOOLEAN,
      component: StatusCell,
      export_value: ({ row }) => (row._is_online ? 'online' : 'offline'),
      operators: [
        table_constants.TABLE_OPERATORS.EQUAL,
        table_constants.TABLE_OPERATORS.NOT_EQUAL,
        table_constants.TABLE_OPERATORS.IS_NULL,
        table_constants.TABLE_OPERATORS.IS_NOT_NULL
      ],
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.ALIAS]: {
      column_title: 'Alias',
      header_label: 'Alias',
      size: 180,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.IDENTITY]
    },
    [ids.ACCOUNT]: {
      column_title: 'Account',
      header_label: 'Account',
      size: 680,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      component: AccountCell,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.IDENTITY]
    },
    [ids.WEIGHT]: {
      column_title: 'Weight',
      header_label: 'Weight',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.NETWORK_WEIGHT]
    },
    [ids.WEIGHT_PCT]: {
      column_title: 'Weight %',
      header_label: '%',
      size: 70,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.NETWORK_WEIGHT]
    },
    [ids.CONFS_BEHIND]: {
      column_title: 'Confirmations Behind',
      header_label: 'Confs Behind',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.UPTIME]: {
      column_title: 'Uptime',
      header_label: 'Uptime',
      size: 150,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      component: UptimeCell,
      export_value: ({ row }) => {
        const seconds = row.uptime
        if (seconds == null) return ''
        const abs = Math.abs(seconds)
        const days = Math.floor(abs / 86400)
        const hours = Math.floor((abs % 86400) / 3600)
        const sign = seconds < 0 ? '-' : ''
        if (days > 0) return `${sign}${days}d ${hours}h`
        return `${sign}${hours}h`
      },
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.VERSION]: {
      column_title: 'Node Version',
      header_label: 'Version',
      size: 90,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.BANDWIDTH_CAP]: {
      column_title: 'Bandwidth Limit',
      header_label: 'BW Limit',
      size: 110,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.PEER_COUNT]: {
      column_title: 'Peer Count',
      header_label: 'Peers',
      size: 70,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.PORT]: {
      column_title: 'Port',
      header_label: 'Port',
      size: 70,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.BLOCKS_BEHIND]: {
      column_title: 'Blocks Behind',
      header_label: 'Blocks Behind',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.CEMENTED_COUNT]: {
      column_title: 'Cemented Count',
      header_label: 'Confs.',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.BLOCK_COUNT]: {
      column_title: 'Block Count',
      header_label: 'Blocks',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.UNCHECKED_COUNT]: {
      column_title: 'Unchecked Count',
      header_label: 'Unchecked',
      size: 100,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.CPU_CORES]: {
      column_title: 'CPU Cores',
      header_label: 'CPU Cores',
      size: 90,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.SYSTEM]
    },
    [ids.CPU_MODEL]: {
      column_title: 'CPU Model',
      header_label: 'CPU Model',
      size: 200,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.SYSTEM]
    },
    [ids.WATT_HOUR]: {
      column_title: 'TDP (wH)',
      header_label: 'TDP (wH)',
      size: 90,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.SYSTEM]
    },
    [ids.PROTOCOL_VERSION]: {
      column_title: 'Protocol Version',
      header_label: 'Protocol',
      size: 90,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.LAST_SEEN]: {
      column_title: 'Last Seen',
      header_label: 'Last Seen',
      size: 100,
      data_type: table_constants.TABLE_DATA_TYPES.NUMBER,
      component: LastSeenCell,
      export_value: ({ row }) =>
        row._is_online
          ? 'online'
          : row.last_seen
            ? timeago.format(row.last_seen * 1000, 'nano_short')
            : '',
      operators: number_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    },
    [ids.ASNAME]: {
      column_title: 'Host ASN',
      header_label: 'Host ASN',
      size: 150,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.LOCATION]
    },
    [ids.COUNTRY]: {
      column_title: 'Country',
      header_label: 'Country',
      size: 120,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.LOCATION]
    },
    [ids.ADDRESS]: {
      column_title: 'Address',
      header_label: 'Address',
      size: 250,
      data_type: table_constants.TABLE_DATA_TYPES.TEXT,
      operators: text_operators,
      column_groups: [COLUMN_GROUPS.TELEMETRY]
    }
  }

  for (const key of Object.keys(fields)) {
    fields[key].column_id = key
    fields[key].accessorKey = key
  }

  return fields
}
