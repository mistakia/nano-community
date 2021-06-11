import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@material-ui/core/LinearProgress'
import { XGrid, GridOverlay } from '@material-ui/x-grid'

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
    const { accounts, cementedMax } = this.props

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
        valueGetter: (p) =>
          p.row.telemetry ? p.row.telemetry.block_count : null
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
        valueGetter: (p) =>
          p.row.telemetry.weight ? p.row.telemetry.weight : null
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
        valueGetter: (p) =>
          p.row.telemetry.bandwidth_cap
            ? (p.row.telemetry.bandwidth_cap / (1024 * 1024)).toFixed(1)
            : null
      },
      {
        field: 'cpu_cores',
        headerName: 'CPU Cores',
        width: 130,
        valueGetter: (p) => (p.row.meta ? p.row.meta.cpu_cores : null)
      },
      {
        field: 'cpu_model',
        hide: true,
        headerName: 'CPU Model',
        valueGetter: (p) => (p.row.meta ? p.row.meta.cpu_model : null)
      },
      {
        field: 'watt_hour',
        width: 120,
        headerName: 'TDP (wH)'
      },
      {
        field: 'last_seen',
        width: 130,
        headerName: 'Last Seen'
      },
      {
        field: 'provider',
        headerName: 'Host',
        width: 130,
        valueGetter: (p) => (p.row.meta ? p.row.meta.provider : null)
      },
      {
        field: 'IP',
        headerName: 'IP',
        valueGetter: (p) => (p.row.telemetry ? p.row.telemetry.address : null)
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
        />
      </div>
    )
  }
}

Representatives.propTypes = {
  accounts: ImmutablePropTypes.list,
  cementedMax: PropTypes.number
}
