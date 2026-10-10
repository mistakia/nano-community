import React, { useState } from 'react'
import PropTypes from 'prop-types'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import FilterNoneIcon from '@mui/icons-material/FilterNone'
import copy from 'copy-text-to-clipboard'

// A value with the site's one-click copy button. A secret value stays masked
// until asked for, and copies without being shown.
export default function CopyValue({ value, secret, on_copy }) {
  const [copied, set_copied] = useState(false)
  const [shown, set_shown] = useState(!secret)

  return (
    <div className='task-copy'>
      <span className='task-copy__value'>
        {shown ? value : `${value.slice(0, 8)}${'•'.repeat(24)}`}
      </span>
      <Tooltip title={copied ? 'copied' : 'click to copy'}>
        <IconButton
          size='small'
          onClick={() => {
            if (!copy(value)) return
            set_copied(true)
            setTimeout(() => set_copied(false), 1500)
            if (on_copy) on_copy()
          }}>
          <FilterNoneIcon fontSize='small' />
        </IconButton>
      </Tooltip>
      {!shown && (
        <a
          href='#'
          className='task-copy__show'
          onClick={(event) => {
            event.preventDefault()
            set_shown(true)
          }}>
          show
        </a>
      )}
    </div>
  )
}

CopyValue.propTypes = {
  value: PropTypes.string.isRequired,
  secret: PropTypes.bool,
  on_copy: PropTypes.func
}
