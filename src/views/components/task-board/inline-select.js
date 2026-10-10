import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

// A property value that opens a menu of choices when the viewer may change
// it, as Base's entity page edits status in place. Read-only otherwise.
export default function InlineSelect({
  value,
  options,
  on_select,
  editable,
  staged,
  children
}) {
  const [anchor, set_anchor] = useState(null)
  if (!editable) return children
  return (
    <>
      <button
        type='button'
        className={`task-inline${staged ? ' task-inline--staged' : ''}`}
        aria-haspopup='listbox'
        onClick={(event) => set_anchor(event.currentTarget)}>
        {children}
        <span className='task-inline__caret' aria-hidden='true'>
          ▾
        </span>
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => set_anchor(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            dense
            selected={option.value === value}
            onClick={() => {
              set_anchor(null)
              on_select(option.value)
            }}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

InlineSelect.propTypes = {
  value: PropTypes.string,
  options: PropTypes.array.isRequired,
  on_select: PropTypes.func.isRequired,
  editable: PropTypes.bool,
  staged: PropTypes.bool,
  children: PropTypes.node
}
