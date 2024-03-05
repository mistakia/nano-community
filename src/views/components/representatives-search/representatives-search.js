import React from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'
import { useTranslation } from 'react-i18next'

import { debounce } from '@core/utils'

import './representatives-search.styl'

export default function RepresentativesSearch({ value, search }) {
  const { t } = useTranslation()
  const [search_value, set_search_value] = React.useState(value)

  const debounce_search = React.useRef(
    debounce((value) => {
      search(value)
    }, 300)
  )

  const handleClick = () => {
    set_search_value('')
    search('')
  }

  const handleChange = (event) => {
    const { value } = event.target
    set_search_value(value)
    debounce_search.current(value)
  }

  return (
    <div className='representatives__search'>
      <input
        className='search__input'
        type='text'
        placeholder={t(
          'representatives_search.placeholder',
          'Filter by account, alias, ip'
        )}
        value={search_value}
        onChange={handleChange}
      />
      {search_value && (
        <div className='search__input-clear' onClick={handleClick}>
          <ClearIcon />
        </div>
      )}
    </div>
  )
}

RepresentativesSearch.propTypes = {
  value: PropTypes.string,
  search: PropTypes.func
}
