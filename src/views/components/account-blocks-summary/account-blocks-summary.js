import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'

import './account-blocks-summary.styl'

export default class AccountBlocksSummary extends React.Component {
  render() {
    const { account, type, accountLabel } = this.props

    const items = account.getIn(['blocks_summary', type], [])
    const isChange = type === 'change'

    const is_loading = account.get(
      `account_is_loading_blocks_${type}_summary`,
      true
    )

    return (
      <div className='blocks__summary'>
        <TableContainer>
          {is_loading && <LinearProgress />}
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{accountLabel} Account</TableCell>
                <TableCell align='left'>TXs</TableCell>
                {!isChange && (
                  <>
                    <TableCell align='left'>Total</TableCell>
                    <TableCell align='left'>Max Amount</TableCell>
                    <TableCell align='left'>Min Amount</TableCell>
                  </>
                )}
                <TableCell align='left'>First Timestamp</TableCell>
                <TableCell align='left'>Last Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {is_loading && (
                <TableRow>
                  <TableCell colSpan={7}>Loading...</TableCell>
                </TableRow>
              )}
              {!items.length && !is_loading && (
                <TableRow>
                  <TableCell colSpan={7}>No Records</TableCell>
                </TableRow>
              )}
              {items.map((row) => (
                <TableRow key={row.destination_account}>
                  <TableCell component='th' scope='row'>
                    <Link to={`/${row.destination_account}`}>
                      {row.destination_alias ||
                        `${row.destination_account.slice(0, 15)}...`}
                    </Link>
                  </TableCell>
                  <TableCell align='left' className='number'>
                    {BigNumber(row.block_count).toFormat(0)}
                  </TableCell>
                  {!isChange && (
                    <>
                      <TableCell align='left' className='number'>
                        {BigNumber(row.total_amount).shiftedBy(-30).toFormat()}
                      </TableCell>
                      <TableCell align='left' className='number'>
                        {BigNumber(row.max_amount).shiftedBy(-30).toFormat()}
                      </TableCell>
                      <TableCell align='left' className='number'>
                        {BigNumber(row.min_amount).shiftedBy(-30).toFormat()}
                      </TableCell>
                    </>
                  )}
                  <TableCell align='left' className='number'>
                    {row.first_timestamp
                      ? dayjs(row.first_timestamp * 1000).format(
                          'YYYY-MM-DD h:mm a'
                        )
                      : '-'}
                  </TableCell>
                  <TableCell align='left' className='number'>
                    {row.last_timestamp
                      ? dayjs(row.last_timestamp * 1000).format(
                          'YYYY-MM-DD h:mm a'
                        )
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 10 && (
            <div className='representative__delegators-footer'>
              Showing top 10 accounts by total descending
            </div>
          )}
        </TableContainer>
      </div>
    )
  }
}

AccountBlocksSummary.propTypes = {
  account: ImmutablePropTypes.record,
  type: PropTypes.string,
  accountLabel: PropTypes.string
}
