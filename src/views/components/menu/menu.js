import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import CloseIcon from '@mui/icons-material/Close'
import SpeedDial from '@mui/material/SpeedDial'
import SpeedDialAction from '@mui/material/SpeedDialAction'
import HomeIcon from '@mui/icons-material/Home'

import SearchBar from '@components/search-bar'
import history from '@core/history'

import './menu.styl'

const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

function MenuSections() {
  return (
    <div className='menu__sections'>
      <div className='menu__section'>
        <div className='menu__heading'>Introduction</div>
        <div className='menu__links'>
          <NavLink to='/introduction/basics'>Overview</NavLink>
          <NavLink to='/introduction/advantages'>Advantages</NavLink>
          <NavLink to='/introduction/how-it-works'>How it works</NavLink>
          <NavLink to='/introduction/why-it-matters'>Why it matters</NavLink>
          <NavLink to='/introduction/misconceptions'>Misconceptions</NavLink>
          <NavLink to='/introduction/investment-thesis'>
            Investment thesis
          </NavLink>
          <NavLink to='/history/overview'>History</NavLink>
          <NavLink to='/faqs'>FAQs</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Guides</div>
        <div className='menu__links'>
          <NavLink to='/getting-started-users/basics'>Basics</NavLink>
          <NavLink to='/getting-started-users/storing/basics'>Storing</NavLink>
          <NavLink to='/getting-started-users/acquiring'>Acquiring</NavLink>
          <NavLink to='/getting-started-users/choosing-a-representative'>
            Choosing a Rep
          </NavLink>
          <NavLink to='/getting-started-users/using'>Using</NavLink>
          <NavLink to='/getting-started-users/storing/setup'>
            Account Setup
          </NavLink>
          <NavLink to='/getting-started-users/privacy'>Privacy</NavLink>
          <NavLink to='/getting-started-users/best-practices'>
            Best Practices
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Learn</div>
        <div className='menu__links'>
          <NavLink to='/design/basics'>Design</NavLink>
          <NavLink to='/design/security'>Security</NavLink>
          <NavLink to='/design/attack-vectors'>Attack Vectors</NavLink>
          <NavLink to='/design/challenges'>Challenges</NavLink>
          <NavLink to='/design/glossary'>Glossary</NavLink>
          <NavLink to='/support'>Get Support</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Developers</div>
        <div className='menu__links'>
          <NavLink to='/getting-started-devs/getting-started'>
            Getting Started
          </NavLink>
          <NavLink to='/getting-started-devs/integrations'>
            Integrations
          </NavLink>
          <NavLink to='/getting-started-devs/running-a-node'>
            Running a node
          </NavLink>
          {/* <NavLink to='/getting-started-devs/tutorials/overview'>
              Tutorials
              </NavLink> */}
          <NavLink to='/getting-started-devs/documentation'>
            Documentation
          </NavLink>
          <NavLink to='/getting-started-devs/protocol-reference'>
            Protocol
          </NavLink>
          {/* <NavLink to='/getting-started-devs/integrations'>Integrations</NavLink> */}
          <NavLink to='/getting-started-devs/developer-discussions'>
            Developer Discussions
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Get Involved</div>
        <div className='menu__links'>
          <NavLink to='/roadmap'>Planning 👾</NavLink>
          <NavLink to='/contributing'>Contribution Guide</NavLink>
          <NavLink to='/community'>Communities</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Stats</div>
        <div className='menu__links'>
          <NavLink to='/representatives'>Representatives</NavLink>
          <NavLink to='/telemetry'>Telemetry</NavLink>
          <NavLink to='/ledger'>Ledger</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Topics</div>
        <div className='menu__links'>
          <NavLink to='/labels/privacy'>Privacy</NavLink>
        </div>
      </div>
    </div>
  )
}

export default function Menu({ hide, hideSearch, hide_speed_dial }) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)
  const handleClick = () => setOpen(!open)
  const handleHomeClick = () => history.push('/')

  const isHome = history.location.pathname === '/'
  const isMobile = window.innerWidth < 750

  return (
    <div className='menu__container'>
      <SwipeableDrawer
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}
        anchor='top'>
        <MenuSections />
      </SwipeableDrawer>
      {!hide_speed_dial && (
        <SpeedDial
          className='menu__dial'
          ariaLabel='menu dial'
          transitionDuration={0}
          direction={isMobile ? 'up' : 'down'}
          onClick={handleClick}
          open={open}
          icon={
            <img
              alt='Nano is feeless, instant, and green / energy efficient digital money (cryptocurrency)'
              src='/resources/symbol-white.svg'
            />
          }
          openIcon={<CloseIcon />}>
          {!isHome && (
            <SpeedDialAction
              icon={<HomeIcon />}
              tooltipTitle='Home'
              tooltipPlacement={isMobile ? 'left' : 'right'}
              onClick={handleHomeClick}
            />
          )}
        </SpeedDial>
      )}
      <div className='menu__body'>
        {isHome ? (
          <div className='menu__text'>NANO</div>
        ) : (
          <NavLink to='/' className='menu__text'>
            NANO
          </NavLink>
        )}
        {!hideSearch && <SearchBar />}
        {!hide && <MenuSections />}
      </div>
    </div>
  )
}

Menu.propTypes = {
  hide: PropTypes.bool,
  hideSearch: PropTypes.bool,
  hide_speed_dial: PropTypes.bool
}
