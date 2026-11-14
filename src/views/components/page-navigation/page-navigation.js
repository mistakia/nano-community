import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import SearchBar from '@components/search-bar'
import { MenuSections } from '@components/menu'

import './page-navigation.styl'

export default function PageNavigation({ hideSections, hideSearch }) {
  const location = useLocation()
  const is_home = location.pathname === '/'

  return (
    <div className='page-navigation'>
      <div className='page-navigation__body'>
        {is_home ? (
          <div className='page-navigation__wordmark'>NANO</div>
        ) : (
          <NavLink to='/' className='page-navigation__wordmark'>
            NANO
          </NavLink>
        )}
        {!hideSearch && <SearchBar />}
        {!hideSections && <MenuSections />}
      </div>
    </div>
  )
}

PageNavigation.propTypes = {
  hideSections: PropTypes.bool,
  hideSearch: PropTypes.bool
}
