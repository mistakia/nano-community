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
        valueGetter: (p) => p.row.is_online
      },
      {
        field: 'alias',
        headerName: 'Alias',
        width: 200
      },
      {
        field: 'account',
        headerName: 'Account',
        renderCell: (p) => (
          <Link to={`/${p.row.account}`}>{p.row.account}</Link>
        ),
        width: 160
      },
      {
        field: 'weight',
        headerName: 'Weight',
        width: 140,
        valueFormatter: (p) =>
          p.value ? `${BigNumber(p.value).shiftedBy(-30).toFormat(0)}` : null,
        valueGetter: (p) => p.row.account_meta.weight
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
            : null
      },
      {
        field: 'confs_behind',
        headerName: 'Confs Behind',
        width: 145,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.cemented_behind
      },
      {
        field: 'uptime',
        headerName: 'Uptime',
        width: 150,
        renderCell: (p) => (
          <Uptime data={p.api.getRow(p.id).uptime} length={25} />
        ),
        valueGetter: (p) => (p.row.last_online || 0) - (p.row.last_offline || 0)
      },
      {
        field: 'version',
        headerName: 'Version',
        width: 110,
        valueGetter: (p) => p.row.version
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
        }
      },
      {
        field: 'peer_count',
        headerName: 'Peers',
        width: 100,
        valueGetter: (p) => p.row.telemetry.peer_count
      },
      {
        field: 'port',
        headerName: 'Port',
        valueGetter: (p) => p.row.telemetry.port
      },
      {
        field: 'blocks_behind',
        headerName: 'Blocks Behind',
        width: 145,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.block_behind
      },
      {
        field: 'cemented_count',
        headerName: 'Confs.',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.cemented_count
      },
      {
        field: 'block_count',
        headerName: 'Blocks',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.block_count
      },
      {
        field: 'unchecked_count',
        headerName: 'Unchecked',
        width: 140,
        valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
        valueGetter: (p) => p.row.telemetry.unchecked_count
      },
      {
        field: 'cpu_cores',
        headerName: 'CPU Cores',
        width: 130,
        valueGetter: (p) => p.row.representative_meta.cpu_cores
      },
      {
        field: 'cpu_model',
        hide: true,
        headerName: 'CPU Model',
        valueGetter: (p) => p.row.representative_meta.cpu_model
      },
      {
        field: 'watt_hour',
        width: 120,
        headerName: 'TDP (wH)'
      },
      {
        field: 'protocol_version',
        headerName: 'Protocol',
        width: 110,
        valueGetter: (p) => p.row.telemetry.protocol_version
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
        valueGetter: (p) => Math.floor(Date.now() / 1000) - p.row.last_seen
      },
      {
        field: 'asname',
        headerName: 'Host ASN',
        width: 130,
        valueGetter: (p) => p.row.network.asname
      },
      {
        field: 'country',
        headerName: 'Country',
        width: 130,
        valueGetter: (p) => p.row.network.country
      },
      {
        field: 'address',
        headerName: 'Address',
        width: 320,
        valueGetter: (p) => p.row.telemetry.address
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
