import React, { useState, useEffect } from 'react'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'
import ImmutablePropTypes from 'react-immutable-proptypes'

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} variant='filled' ref={ref} {...props} />
})

export default function Notification({ info }) {
  const { key } = info
  const [open, setOpen] = useState(!!key)
  const [current_info, set_current_info] = useState(
    key ? info.toJS() : undefined
  )
  const [list, setList] = useState([])

  useEffect(() => {
    // Only add to list if there's a key and it's not already the current_info
    if (key && (!current_info || key !== current_info.key)) {
      setList((prevList) => [...prevList, info.toJS()])
    }
  }, [info])

  useEffect(() => {
    // If there's no current_info, try to set it from the list
    if (!current_info && list.length > 0) {
      set_current_info(list[0])
      setList((prevList) => prevList.slice(1))
      setOpen(true)
    } else if (!open && current_info) {
      // When the Snackbar is closed and there's a current_info, try to show the next notification
      if (list.length > 0) {
        set_current_info(list[0])
        setList((prevList) => prevList.slice(1))
        setOpen(true)
      } else {
        // If there are no more items in the list, clear current_info
        set_current_info(undefined)
      }
    }
  }, [list, current_info, open])

  const handleExited = () => {
    set_current_info(undefined)
  }

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }

    set_current_info(undefined)
    setOpen(false)
  }

  return (
    <Snackbar
      key={current_info ? current_info.key : undefined}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left'
      }}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      message={
        current_info && !current_info.severity
          ? current_info.message
          : undefined
      }>
      {current_info && current_info.severity && (
        <Alert severity={current_info ? current_info.severity : undefined}>
          {current_info ? current_info.message : undefined}
        </Alert>
      )}
    </Snackbar>
  )
}

Notification.propTypes = {
  info: ImmutablePropTypes.record
}
