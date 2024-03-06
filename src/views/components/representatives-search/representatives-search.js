import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey'
import hotkeys from 'hotkeys-js'

import { debounce } from '@core/utils'

import './representatives-search.styl'

const RepresentativesSearch = ({
  value: initialValue,
  search,
  align = 'center'
}) => {
  const [value, setValue] = useState(initialValue || '')
  const inputRef = useRef(null)

  const debouncedSearch = debounce((value) => {
    search(value)
  }, 300)

  useEffect(() => {
    const handleHotkeys = (event, handler) => {
      event.preventDefault()
      inputRef.current.focus()
    }

    hotkeys('command+k,ctrl+k', handleHotkeys)

    return () => {
      hotkeys.unbind('command+k,ctrl+k')
    }
  }, [])

  const handleClick = () => {
    setValue('')
    search('')
  }

  const handleChange = (event) => {
    const { value } = event.target
    setValue(value)
    debouncedSearch(value)
  }

  const classNames = ['representatives__search']

  if (align === 'left') {
    classNames.push('left')
  } else {
    classNames.push('center')
  }

  return (
    <div className={classNames.join(' ')}>
      <input
        ref={inputRef}
        className='search__input'
        type='text'
        placeholder='Filter by account, alias, ip'
        value={value}
        onChange={handleChange}
      />
      <div className='search__shortcut-icon'>
        <KeyboardCommandKeyIcon fontSize='small' />K
      </div>
      {value && (
        <div className='search__input-clear' onClick={handleClick}>
          <ClearIcon />
        </div>
      )}
    </div>
  )
}

RepresentativesSearch.propTypes = {
  value: PropTypes.string,
  search: PropTypes.func,
  align: PropTypes.oneOf(['left', 'center'])
}

export default RepresentativesSearch
