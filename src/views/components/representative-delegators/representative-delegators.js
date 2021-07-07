import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import { Link } from 'react-router-dom'

import './representative-delegators.styl'

export default class RepresentativeDelegators extends React.Component {
  render() {
    const { account } = this.props

    const weight = account.getIn(['account_meta', 'weight'], 0)

    return (
      <TableContainer className='representative__delegators'>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Delegator</TableCell>
              <TableCell align='right'>Balance</TableCell>
              <TableCell align='right'>% of Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {account.delegators.map((row) => (
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
          </TableBody>
        </Table>
        <div className='representative__delegators-footer'>
          Showing top 100 delegators with a minimum balance of 1 Nano.
        </div>
      </TableContainer>
    )
  }
}

RepresentativeDelegators.propTypes = {
  account: ImmutablePropTypes.record
}
