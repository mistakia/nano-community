import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import { Link } from 'react-router-dom'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

import './representatives-offline.styl'

export default function RepresentativesOffline({ accounts }) {
  const { t } = useTranslation()

  const rows = accounts
    .filter((a) => !a.is_online)
    .map((p) => {
      return {
        account: p.account,
        alias: p.alias,
        is_online: p.is_online,
        weight: p.account_meta.weight || 0,
        last_online: p.last_online,
        diff: (p.last_online || 0) - (p.last_offline || 0)
      }
    })

  const sorted = rows.sort((a, b) => b.weight - a.weight)

  return (
    <TableContainer className='representatives__offline'>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>
              {t('representatives_offline.account', 'Offline Account')}
            </TableCell>
            <TableCell align='right'>
              {t('representatives_offline.last_online', 'Last Online')}
            </TableCell>
            <TableCell align='right'>{t('common.weight', 'Weight')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.account}>
              <TableCell component='th' scope='row'>
                <Link to={`/${row.account}`}>
                  {row.alias || `${row.account.slice(0, 15)}...`}
                </Link>
              </TableCell>
              <TableCell align='right'>
                {timeago.format(row.last_online * 1000, 'nano_short')}
              </TableCell>
              <TableCell align='right'>
                {BigNumber(row.weight).shiftedBy(-30).toFormat(0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

RepresentativesOffline.propTypes = {
  accounts: ImmutablePropTypes.map
}
