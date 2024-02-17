import React, { useState } from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import './representative-delegators.styl'

const ITEMS_LIMIT = 10

export default function RepresentativeDelegators({ account }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const handleClick = () => {
    setExpanded(!expanded)
  }

  const weight = account.getIn(['account_meta', 'weight'], 0)
  const is_loading = account.get('account_is_loading')

  return (
    <TableContainer className='representative__delegators'>
      {is_loading && <LinearProgress />}
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>
              {t('common.delegator', { count: 1, defaultValue: 'Delegator' })}
            </TableCell>
            <TableCell align='right'>
              {t('common.balance', 'Balance')}
            </TableCell>
            <TableCell align='right'>% of Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(expanded
            ? account.delegators
            : account.delegators.slice(0, ITEMS_LIMIT)
          ).map((row) => (
            <TableRow key={row.account}>
              <TableCell component='th' scope='row'>
                <Link to={`/${row.account}`}>
                  {row.alias || `${row.account.slice(0, 15)}...`}
                </Link>
              </TableCell>
              <TableCell align='right'>
                {BigNumber(row.balance).shiftedBy(-30).toFormat(0)}
              </TableCell>
              <TableCell align='right'>
                {BigNumber(row.balance)
                  .dividedBy(weight)
                  .multipliedBy(100)
                  .toFormat(2)}
              </TableCell>
            </TableRow>
          ))}
          {account.delegators.length > ITEMS_LIMIT && (
            <TableRow className='table__expand' onClick={handleClick}>
              <TableCell colSpan={3}>
                {expanded
                  ? t('common.collapse', 'Collapse')
                  : t(
                      'common.show_more',
                      { count: account.delegators.length - ITEMS_LIMIT },
                      `Show ${account.delegators.length - ITEMS_LIMIT} more`
                    )}
              </TableCell>
            </TableRow>
          )}
          {is_loading && (
            <TableRow>
              <TableCell colSpan={3}>Loading...</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {!is_loading && (
        <div className='representative__delegators-footer'>
          {t(
            'representative_delegators.showing_top_delegators',
            'Showing top 100 delegators with a minimum balance of 1 Nano.'
          )}
        </div>
      )}
    </TableContainer>
  )
}

RepresentativeDelegators.propTypes = {
  account: ImmutablePropTypes.record
}
