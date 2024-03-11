import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@mui/material/LinearProgress'
import { DataGrid } from '@mui/x-data-grid'
import BigNumber from 'bignumber.js'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

import Uptime from '@components/uptime'
import { timeago } from '@core/utils'

import './representatives.styl'

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0)
    return {
      value: 0,
      label: 'Unlimited'
    }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) {
    return {
      value: bytes,
      label: `${bytes} ${sizes[i]}/s`
    }
  }

  const value = bytes / 1024 ** i

  return {
    value,
    label: `${value.toFixed(1)} ${sizes[i]}/s`
  }
}

function sort_comparator(a, b, cell_params_a) {
  if (a === null || a === undefined || b === null || b === undefined) {
    if (a === b) return 0
    else {
      const sort_model = cell_params_a.api.getSortModel()
      const sort_column = sort_model.find(
        (sm) => sm.field === cell_params_a.field
      )

      if (sort_column && sort_column.sort === 'desc') {
        if (a === null || a === undefined) return -1
        else return 1
      } else {
        if (a === null || a === undefined) return 1
        else return -1
      }
    }
  } else {
    // Ensure both a and b are strings before comparing
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b)
    }

    return a - b
  }
}

export default class Representatives extends React.Component {
  render() {
    const {
      accounts,
      totalWeight,
      isLoading,
      quorumTotal,
      table_height = 600
    } = this.props

    const denominator = quorumTotal || totalWeight

    const columns = [
      {
        field: 'status',
        headerName: '',
        width: 20,
        renderCell: (p) => <Uptime data={p.row.uptime} length={1} />,
        valueGetter: (p) => p.row.is_online,
        sortComparator: sort_comparator
      },
      {
        field: 'alias',
        headerName: 'Alias',
        width: 200,
        sortComparator: sort_comparator
      },
      {
        field: 'account',
        headerName: 'Account',
        renderCell: (p) => (
          <Link to={`/${p.row.account}`}>{p.row.account}</Link>
        ),
        width: 160,
        sortComparator: sort_comparator
      },
      {
        field: 'weight',
        headerName: 'Weight',
        width: 140,
        valueFormatter: (p) =>
          p.value ? `${BigNumber(p.value).shiftedBy(-30).toFormat(0)}` : null,
        valueGetter: (p) => p.row.account_meta.weight,
        sortComparator: sort_comparator
      },
      {
        field: 'weight_pct',
        headerName: '%',
        width: 80,
        valueFormatter: (p) => (p.value ? `${p.value.toFixed(2)}%` : null),
        valueGetter: (p) =>
          p.row.account_meta.weight
            ? BigNumber(p.row.account_meta.weight)
                .dividedBy(denominator)
                .multipliedBy(100)
            : null,
        sortComparator: sort_comparator
      },
      {
        field: 'confs_behind',
        headerName: 'Confs Behind',
        width: 145,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.cemented_behind,
        sortComparator: sort_comparator
      },
      {
        field: 'uptime',
        headerName: 'Uptime',
        width: 150,
        renderCell: (p) => (
          <Uptime data={p.api.getRow(p.id).uptime} length={25} />
        ),
        valueGetter: (p) =>
          (p.row.last_online || 0) - (p.row.last_offline || 0),
        sortComparator: sort_comparator
      },
      {
        field: 'version',
        headerName: 'Version',
        width: 110,
        valueGetter: (p) => p.row.version,
        sortComparator: sort_comparator
      },
      {
        field: 'bandwidth_cap',
        headerName: 'BW Limit',
        width: 120,
        valueFormatter: (p) => {
          if (p.api.getRow(p.id).telemetry.bandwidth_cap === 0)
            return 'Unlimited'
          return p.api.getRow(p.id).telemetry.bandwidth_cap
            ? bytesToSize(p.api.getRow(p.id).telemetry.bandwidth_cap).label
            : null
        },
        valueGetter: (p) => {
          if (p.row.telemetry.bandwidth_cap === 0) return Infinity
          return p.row.telemetry.bandwidth_cap
            ? bytesToSize(p.row.telemetry.bandwidth_cap).value
            : null
        },
        sortComparator: sort_comparator
      },
      {
        field: 'peer_count',
        headerName: 'Peers',
        width: 100,
        valueGetter: (p) => p.row.telemetry.peer_count,
        sortComparator: sort_comparator
      },
      {
        field: 'port',
        headerName: 'Port',
        valueGetter: (p) => p.row.telemetry.port,
        sortComparator: sort_comparator
      },
      {
        field: 'blocks_behind',
        headerName: 'Blocks Behind',
        width: 145,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.block_behind,
        sortComparator: sort_comparator
      },
      {
        field: 'cemented_count',
        headerName: 'Confs.',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.cemented_count,
        sortComparator: sort_comparator
      },
      {
        field: 'block_count',
        headerName: 'Blocks',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.block_count,
        sortComparator: sort_comparator
      },
      {
        field: 'unchecked_count',
        headerName: 'Unchecked',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.unchecked_count,
        sortComparator: sort_comparator
      },
      {
        field: 'cpu_cores',
        headerName: 'CPU Cores',
        width: 130,
        valueGetter: (p) => p.row.representative_meta.cpu_cores,
        sortComparator: sort_comparator
      },
      {
        field: 'cpu_model',
        hide: true,
        headerName: 'CPU Model',
        valueGetter: (p) => p.row.representative_meta.cpu_model,
        sortComparator: sort_comparator
      },
      {
        field: 'watt_hour',
        width: 120,
        headerName: 'TDP (wH)',
        sortComparator: sort_comparator
      },
      {
        field: 'protocol_version',
        headerName: 'Protocol',
        width: 110,
        valueGetter: (p) => p.row.telemetry.protocol_version,
        sortComparator: sort_comparator
      },
      {
        field: 'last_seen',
        width: 130,
        headerName: 'Last Seen',
        renderCell: (p) =>
          p.row.is_online ? (
            <FiberManualRecordIcon className='green' />
          ) : (
            timeago.format(p.row.last_seen * 1000, 'nano_short')
          ),
        valueGetter: (p) => Math.floor(Date.now() / 1000) - p.row.last_seen,
        sortComparator: sort_comparator
      },
      {
        field: 'asname',
        headerName: 'Host ASN',
        width: 130,
        valueGetter: (p) => p.row.network.asname,
        sortComparator: sort_comparator
      },
      {
        field: 'country',
        headerName: 'Country',
        width: 130,
        valueGetter: (p) => p.row.network.country,
        sortComparator: sort_comparator
      },
      {
        field: 'address',
        headerName: 'Address',
        width: 320,
        valueGetter: (p) => p.row.telemetry.address,
        sortComparator: sort_comparator
      }
    ]
    return (
      <div className='representatives' style={{ height: table_height }}>
        <DataGrid
          slots={{ loadingOverlay: LinearProgress }}
          disableColumnMenu={true}
          loading={isLoading}
          rowHeight={36}
          pageSize={100}
          columns={columns}
          columnBuffer={columns.length}
          getRowId={(row) => row.account}
          rows={accounts.toJS()}
          initialState={{
            sorting: {
              sortModel: [{ field: 'weight', sort: 'desc' }]
            }
          }}
        />
      </div>
    )
  }
}

Representatives.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number,
  quorumTotal: PropTypes.number,
  isLoading: PropTypes.bool,
  table_height: PropTypes.number
}
