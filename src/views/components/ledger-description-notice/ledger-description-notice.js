import React from 'react'
import dayjs from 'dayjs'
import InfoIcon from '@mui/icons-material/Info'

import './ledger-description-notice.styl'

const timestamp = 1550832660

export default function LedgerDescriptionNotice() {
  const local_time = dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')
  return (
    <div className='ledger-chart-description-notice'>
      <InfoIcon />
      <div className='ledger-chart-description-notice-text'>
        Data displayed includes only blocks with a timestamp. Local timestamps
        were first recorded:{' '}
        <span className='ledger-chart-description-notice-local-time'>
          {local_time}
        </span>
        . Data from blocks before this date are not included.
      </div>
    </div>
  )
}
