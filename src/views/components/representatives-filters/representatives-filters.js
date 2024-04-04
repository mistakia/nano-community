import React from 'react'
import PropTypes from 'prop-types'
import ClearIcon from '@mui/icons-material/Clear'
import { useTranslation } from 'react-i18next'

import './representatives-filters.styl'

export default function RepresentativesFilters({ filter, field }) {
  const { t } = useTranslation()
  const handleClick = () => {
    // clear filters
    filter()
  }

  if (!field) {
    return null
  }

  return (
    <div className='representatives__filters' onClick={handleClick}>
      <ClearIcon />
      <div>{t('common.clear_filters', 'Clear Filters')}</div>
    </div>
  )
}

RepresentativesFilters.propTypes = {
  filter: PropTypes.func,
  field: PropTypes.string
}
