import React from 'react'
import BigNumber from 'bignumber.js'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { Link } from 'react-router-dom'

import './representative-delegators.styl'

const ITEMS_LIMIT = 10

export default class RepresentativeDelegators extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      expanded: false
    }
  }

  handleClick = () => {
    this.setState({ expanded: !this.state.expanded })
  }

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
            {(this.state.expanded
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
              <TableRow className='table__expand' onClick={this.handleClick}>
                <TableCell colSpan={3}>
                  {this.state.expanded
                    ? 'Collapse'
                    : `Show ${account.delegators.length - ITEMS_LIMIT} more`}
                </TableCell>
              </TableRow>
            )}
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
