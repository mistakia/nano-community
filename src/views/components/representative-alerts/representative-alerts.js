import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import { Link } from 'react-router-dom'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useTranslation } from 'react-i18next'

import { timeago } from '@core/utils'

import './representative-alerts.styl'

const ITEMS_LIMIT = 7

const getTooltipText = ({ type, t }) => {
  switch (type) {
    case 'offline':
      return t(
        'representative_alerts.tooltip.offline',
        'Representative has stopped voting and appears offline.'
      )

    case 'behind':
      return t(
        'representative_alerts.tooltip.behind',
        'Representative has fallen behind or is bootstrapping. The cutoff is a cemented count beyond the 95th percentile. (via telemetry)'
      )

    case 'overweight':
      return t(
        'representative_alerts.tooltip.overweight',
        "Representative has beyond 3M Nano voting weight. Delegators should consider distributing the weight to improve the network's resilience and value."
      )

    case 'low uptime':
      return t(
        'representative_alerts.tooltip.low_uptime',
        'Representative has been offline more than 25% in the last 28 days.'
      )
  }
}

export default function RepresentativeAlerts({
  items,
  isLoading,
  onlineWeight
}) {
  const [expanded, setExpanded] = React.useState(false)
  const { t } = useTranslation()

  const handleClick = () => setExpanded(!expanded)
  return (
    <>
      <TableContainer className='representatives__alerts'>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>
                {t(
                  'representative_alerts.table_header.representative',
                  'Representative'
                )}
              </TableCell>
              <TableCell>
                {t('representative_alerts.table_header.issue', 'Issue')}
              </TableCell>
              <TableCell align='right'>
                {t(
                  'representative_alerts.table_header.last_online',
                  'Last Online'
                )}
              </TableCell>
              <TableCell align='right'>
                {t('common.weight', 'Weight')}
              </TableCell>
              <TableCell align='right'>
                {t(
                  'representative_alerts.table_header.percent_online_weight',
                  '% Online Weight'
                )}
              </TableCell>
              <TableCell align='right'>
                {t('representative_alerts.table_header.behind', 'Behind')}
              </TableCell>
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
            {(expanded ? items : items.slice(0, ITEMS_LIMIT)).map(
              (row, idx) => (
                <TableRow key={idx} className={row.type}>
                  <TableCell component='th' scope='row'>
                    <Link to={`/${row.account.account}`}>
                      {row.account.alias ||
                        `${row.account.account.slice(0, 15)}...`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={getTooltipText({ type: row.type, t })}>
                      <Chip
                        className={`rep__alert ${row.type}`}
                        size='small'
                        label={t(
                          `representative_alerts.type.${row.type}`,
                          row.type
                        )}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    className='rep__alert-metric offline'
                    align='right'>
                    {row.account.is_online ? (
                      <FiberManualRecordIcon className='green' />
                    ) : row.account.last_online ? (
                      timeago.format(
                        row.account.last_online * 1000,
                        'nano_short'
                      )
                    ) : (
                      ''
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
              <TableRow className='table__expand' onClick={handleClick}>
                <TableCell colSpan={6}>
                  {expanded
                    ? t('common.collapse', 'Collapse')
                    : t('common.show_more', {
                        count: items.length - ITEMS_LIMIT,
                        defaultValue: `Show ${
                          items.length - ITEMS_LIMIT || 0
                        } more`
                      })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

RepresentativeAlerts.propTypes = {
  items: PropTypes.array,
  isLoading: PropTypes.bool,
  onlineWeight: PropTypes.number
}
