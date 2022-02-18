import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import { Link } from 'react-router-dom'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Chip from '@material-ui/core/Chip'
import Tooltip from '@material-ui/core/Tooltip'
import Skeleton from '@material-ui/lab/Skeleton'
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord'

import { timeago } from '@core/utils'

import './representative-alerts.styl'

const ITEMS_LIMIT = 7

const getTooltipText = (type) => {
  switch (type) {
    case 'offline':
      return 'Representative has stopped voting and appears offline.'

    case 'behind':
      return 'Representative has fallen behind or is bootstrapping. The cutoff is a cemented count beyond the 95th percentile. (via telemetry)'

    case 'overweight':
      return "Representative has beyond 3M Nano voting weight. Delegators should consider distributing the weight to improve the network's resilience and value."

    case 'low uptime':
      return 'Representative has been offline more than 25% in the last 28 days.'
  }
}

export default class RepresentativeAlerts extends React.Component {
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
    const { items, isLoading, onlineWeight } = this.props

    return (
      <>
        <TableContainer className='representatives__alerts'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Representative</TableCell>
                <TableCell>Issue</TableCell>
                <TableCell align='right'>Last Online</TableCell>
                <TableCell align='right'>Weight</TableCell>
                <TableCell align='right'>% Online Weight</TableCell>
                <TableCell align='right'>Behind</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                  <TableCell>
                    <Skeleton height={30} />
                  </TableCell>
                </TableRow>
              )}
              {(this.state.expanded ? items : items.slice(0, ITEMS_LIMIT)).map(
                (row, idx) => (
                  <TableRow key={idx} className={row.type}>
                    <TableCell component='th' scope='row'>
                      <Link to={`/${row.account.account}`}>
                        {row.account.alias ||
                          `${row.account.account.slice(0, 15)}...`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getTooltipText(row.type)}>
                        <Chip
                          className={`rep__alert ${row.type}`}
                          size='small'
                          label={row.type}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell
                      className='rep__alert-metric offline'
                      align='right'>
                      {row.account.is_online ? (
                        <FiberManualRecordIcon className='green' />
                      ) : (
                        timeago.format(
                          row.account.last_online * 1000,
                          'nano_short'
                        )
                      )}
                    </TableCell>
                    <TableCell className='rep__alert-metric' align='right'>
                      {BigNumber(row.account.account_meta.weight)
                        .shiftedBy(-30)
                        .toFormat(0)}
                    </TableCell>
                    <TableCell className='rep__alert-metric' align='right'>
                      {row.account.account_meta.weight && onlineWeight
                        ? `${BigNumber(row.account.account_meta.weight)
                            .dividedBy(onlineWeight)
                            .multipliedBy(100)
                            .toFormat(2)} %`
                        : '-'}
                    </TableCell>
                    <TableCell className='rep__alert-metric' align='right'>
                      {row.account.telemetry.cemented_behind >= 0
                        ? BigNumber(
                            row.account.telemetry.cemented_behind
                          ).toFormat(0)
                        : '-'}
                    </TableCell>
                  </TableRow>
                )
              )}
              {items.length > ITEMS_LIMIT && (
                <TableRow className='table__expand' onClick={this.handleClick}>
                  <TableCell colSpan={6}>
                    {this.state.expanded
                      ? 'Collapse'
                      : `Show ${items.length - ITEMS_LIMIT} more`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    )
  }
}

RepresentativeAlerts.propTypes = {
  items: PropTypes.array,
  isLoading: PropTypes.bool,
  onlineWeight: PropTypes.number
}
