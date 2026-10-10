import React from 'react'
import PropTypes from 'prop-types'

import { format_age, format_date } from './format'

// Relative time, with the exact time one hover away.
export default function Age({ at }) {
  return (
    <time
      className='task-age'
      dateTime={new Date(at * 1000).toISOString()}
      title={format_date(at)}>
      {format_age(at)}
    </time>
  )
}

Age.propTypes = { at: PropTypes.number.isRequired }
