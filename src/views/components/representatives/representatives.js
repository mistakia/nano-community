import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import ImmutablePropTypes from 'react-immutable-proptypes'
import LinearProgress from '@mui/material/LinearProgress'
import { DataGrid } from '@mui/x-data-grid'
import BigNumber from 'bignumber.js'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useTranslation } from 'react-i18next'

import Uptime from '@components/uptime'
import { timeago } from '@core/utils'

import './representatives.styl'

function bytesToSize({ bytes, t }) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0)
    return {
      value: 0,
      label: t('common.unlimited', 'Unlimited')
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

export default function Representatives({
  accounts,
  totalWeight,
  quorumTotal,
  isLoading,
  table_height = 600
}) {
  const { t } = useTranslation()
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
      headerName: t('representatives.alias', 'Alias'),
      width: 200
    },
    {
      field: 'account',
      headerName: t('common.account', { count: 1, defaultValue: 'Account' }),
      renderCell: (p) => <Link to={`/${p.row.account}`}>{p.row.account}</Link>,
      width: 160
    },
    {
      field: 'weight',
      headerName: t('common.weight', 'Weight'),
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
      headerName: t('common.confirmations_behind', 'Confs Behind'),
      width: 145,
      valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
      valueGetter: (p) => p.row.telemetry.cemented_behind
    },
    {
      field: 'uptime',
      headerName: t('common.uptime', 'Uptime'),
      width: 150,
      renderCell: (p) => (
        <Uptime data={p.api.getRow(p.id).uptime} length={25} />
      ),
      valueGetter: (p) => (p.row.last_online || 0) - (p.row.last_offline || 0)
    },
    {
      field: 'version',
      headerName: t('common.version', 'Version'),
      width: 110,
      valueGetter: (p) => p.row.version
    },
    {
      field: 'bandwidth_cap',
      headerName: t('common.bandwidth_limit_short', 'BW Limit'),
      width: 120,
      valueFormatter: (p) => {
        if (p.api.getRow(p.id).telemetry.bandwidth_cap === 0)
          return t('common.unlimited', 'Unlimited')
        return p.api.getRow(p.id).telemetry.bandwidth_cap
          ? bytesToSize({
              bytes: p.api.getRow(p.id).telemetry.bandwidth_cap,
              t
            }).label
          : null
      },
      valueGetter: (p) => {
        if (p.row.telemetry.bandwidth_cap === 0) return Infinity
        return p.row.telemetry.bandwidth_cap
          ? bytesToSize({ bytes: p.row.telemetry.bandwidth_cap, t }).value
          : null
      }
    },
    {
      field: 'peer_count',
      headerName: t('common.peers', 'Peers'),
      width: 100,
      valueGetter: (p) => p.row.telemetry.peer_count
    },
    {
      field: 'port',
      headerName: t('common.port', 'Port'),
      valueGetter: (p) => p.row.telemetry.port
    },
    {
      field: 'blocks_behind',
      headerName: t('common.blocks_behind', 'Blocks Behind'),
      width: 145,
      valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
      valueGetter: (p) => p.row.telemetry.block_behind
    },
    {
      field: 'cemented_count',
      headerName: t('common.conf_short', 'Conf.'),
      width: 140,
      valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
      valueGetter: (p) => p.row.telemetry.cemented_count
    },
    {
      field: 'block_count',
      headerName: t('common.blocks', 'Blocks'),
      width: 140,
      valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
      valueGetter: (p) => p.row.telemetry.block_count
    },
    {
      field: 'unchecked_count',
      headerName: t('common.unchecked_count', 'Unchecked'),
      width: 140,
      valueFormatter: (p) => (p.value ? BigNumber(p.value).toFormat() : null),
      valueGetter: (p) => p.row.telemetry.unchecked_count
    },
    {
      field: 'cpu_cores',
      headerName: t('representatives.cpu_cores', 'CPU Cores'),
      width: 130,
      valueGetter: (p) => p.row.representative_meta.cpu_cores
    },
    {
      field: 'cpu_model',
      hide: true,
      headerName: t('representatives.cpu_model', 'CPU Model'),
      valueGetter: (p) => p.row.representative_meta.cpu_model
    },
    {
      field: 'watt_hour',
      width: 120,
      headerName: t('representatives.tdp', 'TDP (wH)')
    },
    {
      field: 'protocol_version',
      headerName: t('representatives.protocol_version', 'Protocol'),
      width: 110,
      valueGetter: (p) => p.row.telemetry.protocol_version
    },
    {
      field: 'last_seen',
      width: 130,
      headerName: t('representatives.last_seen', 'Last Seen'),
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
      headerName: t('representatives.host_asn', 'Host ASN'),
      width: 130,
      valueGetter: (p) => p.row.network.asname
    },
    {
      field: 'country',
      headerName: t('common.country', 'Country'),
      width: 130,
      valueGetter: (p) => p.row.network.country
    },
    {
      field: 'address',
      headerName: t('common.address', 'Address'),
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

Representatives.propTypes = {
  accounts: ImmutablePropTypes.list,
  totalWeight: PropTypes.number,
  quorumTotal: PropTypes.number,
  isLoading: PropTypes.bool,
  table_height: PropTypes.number
}
