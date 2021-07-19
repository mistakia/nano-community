import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import { Link } from 'react-router-dom'

import './account-blocks-summary.styl'

export default class AccountBlocksSummary extends React.Component {
  render() {
    const { account, type, accountLabel } = this.props

    const items = account.getIn(['blocks_summary', type], [])
    const isChange = type === 'change'

    return (
      <div className='account__section'>
        <div className='account__section-heading'>
          <span>{type} Summary</span>
        </div>
        <TableContainer className='blocks__summary'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{accountLabel} Account</TableCell>
                <TableCell align='left'>TXs</TableCell>
                {!isChange && <TableCell align='left'>Total</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={3}>No Records</TableCell>
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
                    <TableCell align='left' className='number'>
                      {BigNumber(row.total_amount).shiftedBy(-30).toFormat()}
                    </TableCell>
                  )}
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
