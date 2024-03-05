import React from 'react'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'

import history from '@core/history'

import './search-bar.styl'

const ACCOUNT_REGEX = /((nano|xrb)_)?[13][13-9a-km-uw-z]{59}/
const BLOCK_REGEX = /[0-9A-F]{64}/

export default function SearchBar() {
  const { t } = useTranslation()
  const [value, set_value] = React.useState('')
  const [invalid, set_invalid] = React.useState(false)

  const handleClick = () => {
    set_value('')
  }

  const handleChange = (event) => {
    const { value } = event.target
    set_value(value)
    if (ACCOUNT_REGEX.test(value) || BLOCK_REGEX.test(value)) {
      history.push(`/${value}`)
    } else {
      set_invalid(true)
    }
  }

  const isFilled = Boolean(value)
  return (
    <div className={`search__bar ${invalid && 'invalid'}`}>
      <SearchIcon className='search__icon' />
      <input
        className={`search__input ${isFilled ? 'filled' : ''}`}
        type='text'
        placeholder={t(
          'search_bar.placeholder',
          'Search by Address / Block Hash'
        )}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <div className='search__input-clear' onClick={handleClick}>
          <ClearIcon />
        </div>
      )}
    </div>
  )
}
