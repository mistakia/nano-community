import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@material-ui/core/LinearProgress'
import { XGrid, GridOverlay } from '@material-ui/x-grid'
import BigNumber from 'bignumber.js'

import { timeago } from '@core/utils'

import './representatives.styl'

function LoadingOverlay() {
  return (
    <GridOverlay>
      <div style={{ position: 'absolute', top: 0, width: '100%' }}>
        <LinearProgress />
      </div>
    </GridOverlay>
  )
}

export default class Representatives extends React.Component {
  render() {
    const { accounts, cementedMax, totalWeight } = this.props

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
        field: 'block_count',
        headerName: 'Blocks',
        hide: true,
        valueGetter: (p) => p.row.telemetry.block_count
      },
      {
        field: 'cemented_count',
        headerName: 'Cemented Diff',
        width: 130,
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
        <XGrid
          components={{ LoadingOverlay }}
          disableColumnMenu={true}
          loading={accounts.size === 0}
          rowHeight={36}
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
  cementedMax: PropTypes.number
}
