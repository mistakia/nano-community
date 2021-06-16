import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@material-ui/core/LinearProgress'
import { DataGrid, GridOverlay } from '@material-ui/data-grid'
import BigNumber from 'bignumber.js'

import Uptime from '@components/uptime'
import { timeago } from '@core/utils'

import './representatives.styl'

function LoadingOverlay() {
  return (
    <GridOverlay>
      <div style={{ position: 'absolute', top: 0, width: '100%' }}>
        <LinearProgress color='secondary' />
      </div>
    </GridOverlay>
  )
}

export default class Representatives extends React.Component {
  render() {
    const { accounts, cementedMax, checkedMax, totalWeight } = this.props

    const columns = [
      {
        field: 'account',
        headerName: 'Account',
        width: 110
      },
      {
        field: 'alias',
        headerName: 'Alias',
        width: 110
      },
      {
        field: 'confs_behind',
        headerName: 'Confs Behind',
        width: 140,
        valueFormatter: (p) =>
          p.row.telemetry.cemented_count
            ? BigNumber(cementedMax - p.row.telemetry.cemented_count).toFormat()
            : null,
        valueGetter: (p) =>
          p.row.telemetry.cemented_count
            ? cementedMax - p.row.telemetry.cemented_count
            : null
      },
      {
        field: 'weight',
        headerName: 'Weight',
        width: 110,
        valueFormatter: (p) =>
          p.row.telemetry.weight
            ? `${BigNumber(p.row.telemetry.weight)
                .dividedBy(totalWeight)
                .multipliedBy(100)
                .toFixed(2)}%`
            : null,
        valueGetter: (p) =>
          p.row.telemetry.weight
            ? BigNumber(p.row.telemetry.weight)
                .dividedBy(totalWeight)
                .multipliedBy(100)
            : null
      },
      {
        field: 'uptime',
        headerName: 'Uptime',
        width: 150,
        renderCell: (p) => <Uptime data={p.row.uptime} />,
        valueGetter: (p) => {
          // TODO
          return 0
        }
      },
      {
        field: 'major_version',
        headerName: 'Version',
        width: 110,
        valueGetter: (p) => {
          if (!p.row.telemetry.major_version) return null
          /* eslint-disable camelcase */
          const {
            major_version,
            minor_version,
            patch_version,
            pre_release_version
          } = p.row.telemetry
          return `${major_version}.${minor_version}.${patch_version}.${pre_release_version}`
          /* eslint-enable camelcase */
        }
      },
      {
        field: 'bandwidth_cap',
        headerName: 'BW Limit',
        width: 120,
        valueFormatter: (p) => {
          if (p.row.telemetry.bandwidth_cap === 0) return 'Unlimited'
          return p.row.telemetry.weight
            ? (p.row.telemetry.bandwidth_cap / (1024 * 1024)).toFixed(1)
            : null
        },
        valueGetter: (p) => {
          if (p.row.telemetry.bandwidth_cap === 0) return Infinity
          return p.row.telemetry.bandwidth_cap
            ? p.row.telemetry.bandwidth_cap / (1024 * 1024)
            : null
        }
      },
      {
        field: 'blocks_behind',
        headerName: 'Blocks Behind',
        width: 140,
        valueFormatter: (p) =>
          p.row.telemetry.block_count
            ? BigNumber(checkedMax - p.row.telemetry.block_count).toFormat()
            : null,
        valueGetter: (p) =>
          p.row.telemetry.block_count
            ? checkedMax - p.row.telemetry.block_count
            : null
      },
      {
        field: 'cemented_count',
        headerName: 'Confs.',
        width: 140,
        valueFormatter: (p) =>
          p.row.telemetry.cemented_count
            ? BigNumber(p.row.telemetry.cemented_count).toFormat()
            : null,
        valueGetter: (p) => p.row.telemetry.cemented_count
      },
      {
        field: 'block_count',
        headerName: 'Blocks',
        width: 140,
        valueFormatter: (p) =>
          p.row.telemetry.block_count
            ? BigNumber(p.row.telemetry.block_count).toFormat()
            : null,
        valueGetter: (p) => p.row.telemetry.block_count
      },
      {
        field: 'cpu_cores',
        headerName: 'CPU Cores',
        width: 130,
        valueGetter: (p) => p.row.meta.cpu_cores
      },
      {
        field: 'cpu_model',
        hide: true,
        headerName: 'CPU Model',
        valueGetter: (p) => p.row.meta.cpu_model
      },
      {
        field: 'watt_hour',
        width: 120,
        headerName: 'TDP (wH)'
      },
      {
        field: 'last_seen',
        width: 130,
        headerName: 'Last Seen',
        valueFormatter: (p) =>
          timeago.format(p.row.last_seen * 1000, 'nano_short'),
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
        field: 'IP',
        headerName: 'IP',
        hide: true,
        valueGetter: (p) => p.row.telemetry.address
      }
    ]
    return (
      <div className='representatives' style={{ height: 500 }}>
        <DataGrid
          components={{ LoadingOverlay }}
          disableColumnMenu={true}
          loading={accounts.size === 0}
          rowHeight={36}
          pageSize={100}
          columns={columns}
          columnBuffer={columns.length}
          getRowId={(row) => row.account}
          rows={accounts.toJS()}
          sortModel={[{ field: 'weight', sort: 'desc' }]}
        />
      </div>
    )
  }
}

Representatives.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number,
  cementedMax: PropTypes.number,
  checkedMax: PropTypes.number
}
