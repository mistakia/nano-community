import React, { useState, useEffect, useRef } from 'react'
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'

import history from '@core/history'

import './search-bar.styl'

const ACCOUNT_REGEX = /((nano|xrb)_)?[13][13-9a-km-uw-z]{59}/
const BLOCK_REGEX = /[0-9A-F]{64}/

const SearchBar = () => {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const input_ref = useRef(null)

  useEffect(() => {
    const handle_key_down = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'l') {
        event.preventDefault()
        input_ref.current.focus()
      }
    }

    document.addEventListener('keydown', handle_key_down)

    return () => {
      document.removeEventListener('keydown', handle_key_down)
    }
  }, [])

  const handle_click = () => {
    setValue('')
  }

  const handle_change = (event) => {
    const { value } = event.target
    setValue(value)
    if (ACCOUNT_REGEX.test(value) || BLOCK_REGEX.test(value)) {
      history.push(`/${value}`)
    } else {
      setInvalid(true)
    }
  }

  const is_filled = Boolean(value)
  return (
    <div className={`search__bar ${invalid && 'invalid'}`}>
      <SearchIcon className='search__icon' />
      <input
        ref={input_ref}
        className={`search__input ${is_filled ? 'filled' : ''}`}
        type='text'
        placeholder={t(
          'search_bar.placeholder',
          'Search by Address / Block Hash'
        )}
        value={value}
        onChange={handle_change}
      />
      <div className='search__shortcut-icon'>
        <KeyboardCommandKeyIcon fontSize='small' />L
      </div>
      {value && (
        <div className='search__input-clear' onClick={handle_click}>
          <ClearIcon />
        </div>
      )}
    </div>
  )
}

export default SearchBar
