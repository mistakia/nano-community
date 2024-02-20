import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import CloseIcon from '@mui/icons-material/Close'
import SpeedDial from '@mui/material/SpeedDial'
import SpeedDialAction from '@mui/material/SpeedDialAction'
import HomeIcon from '@mui/icons-material/Home'
import { useTranslation } from 'react-i18next'

import SearchBar from '@components/search-bar'
import history from '@core/history'
import ChangeLocale from '@components/change-locale'

import './menu.styl'

const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

function MenuSections() {
  const { t } = useTranslation()
  return (
    <div className='menu__sections'>
      <div className='menu__section'>
        <div className='menu__heading'>
          {t('menu.introduction', 'Introduction')}
        </div>
        <div className='menu__links'>
          <NavLink to='/introduction/basics'>
            {t('menu.overview', 'Overview')}
          </NavLink>
          <NavLink to='/introduction/advantages'>
            {t('menu.advantages', 'Advantages')}
          </NavLink>
          <NavLink to='/introduction/how-it-works'>
            {t('menu.how_it_works', 'How it works')}
          </NavLink>
          <NavLink to='/introduction/why-it-matters'>
            {t('menu.why_it_matters', 'Why it matters')}
          </NavLink>
          <NavLink to='/introduction/misconceptions'>
            {t('menu.misconceptions', 'Misconceptions')}
          </NavLink>
          <NavLink to='/introduction/investment-thesis'>
            {t('menu.investment_thesis', 'Investment thesis')}
          </NavLink>
          <NavLink to='/history/overview'>
            {t('menu.history', 'History')}
          </NavLink>
          <NavLink to='/faqs'>{t('menu.faqs', 'FAQs')}</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>{t('menu.guides', 'Guides')}</div>
        <div className='menu__links'>
          <NavLink to='/getting-started-users/basics'>
            {t('menu.basics', 'Basics')}
          </NavLink>
          <NavLink to='/getting-started-users/storing/basics'>
            {t('menu.storing', 'Storing')}
          </NavLink>
          <NavLink to='/getting-started-users/acquiring'>
            {t('menu.acquiring', 'Acquiring')}
          </NavLink>
          <NavLink to='/getting-started-users/choosing-a-representative'>
            {t('menu.choosing_a_rep', 'Choosing a Rep')}
          </NavLink>
          <NavLink to='/getting-started-users/using'>
            {t('menu.using', 'Using')}
          </NavLink>
          <NavLink to='/getting-started-users/storing/setup'>
            {t('menu.account_setup', 'Account Setup')}
          </NavLink>
          <NavLink to='/getting-started-users/privacy'>
            {t('menu.privacy', 'Privacy')}
          </NavLink>
          <NavLink to='/getting-started-users/best-practices'>
            {t('menu.best_practices', 'Best Practices')}
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>{t('menu.learn', 'Learn')}</div>
        <div className='menu__links'>
          <NavLink to='/design/basics'>{t('menu.design', 'Design')}</NavLink>
          <NavLink to='/design/security'>
            {t('menu.security', 'Security')}
          </NavLink>
          <NavLink to='/design/attack-vectors'>
            {t('menu.attack_vectors', 'Attack Vectors')}
          </NavLink>
          <NavLink to='/design/challenges'>
            {t('menu.challenges', 'Challenges')}
          </NavLink>
          <NavLink to='/design/glossary'>
            {t('menu.glossary', 'Glossary')}
          </NavLink>
          <NavLink to='/support'>
            {t('menu.get_support', 'Get Support')}
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>
          {t('menu.developers', 'Developers')}
        </div>
        <div className='menu__links'>
          <NavLink to='/getting-started-devs/getting-started'>
            {t('menu.getting_started', 'Getting Started')}
          </NavLink>
          <NavLink to='/getting-started-devs/integrations'>
            {t('menu.integrations', 'Integrations')}
          </NavLink>
          <NavLink to='/getting-started-devs/running-a-node'>
            {t('menu.running_a_node', 'Running a node')}
          </NavLink>
          <NavLink to='/getting-started-devs/documentation'>
            {t('menu.documentation', 'Documentation')}
          </NavLink>
          <NavLink to='/getting-started-devs/protocol-reference'>
            {t('menu.protocol', 'Protocol')}
          </NavLink>
          <NavLink to='/getting-started-devs/developer-discussions'>
            {t('menu.developer_discussions', 'Developer Discussions')}
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>
          {t('menu.get_involved', 'Get Involved')}
        </div>
        <div className='menu__links'>
          <NavLink to='/roadmap'>{t('menu.planning', 'Planning 👾')}</NavLink>
          <NavLink to='/contributing'>
            {t('menu.contribution_guide', 'Contribution Guide')}
          </NavLink>
          <NavLink to='/community'>
            {t('menu.communities', 'Communities')}
          </NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>{t('menu.stats', 'Stats')}</div>
        <div className='menu__links'>
          <NavLink to='/representatives'>
            {t('common.representative', {
              count: 2,
              defaultValue: 'Representatives'
            })}
          </NavLink>
          <NavLink to='/telemetry'>{t('menu.telemetry', 'Telemetry')}</NavLink>
          <NavLink to='/ledger'>{t('menu.ledger', 'Ledger')}</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>{t('menu.topics', 'Topics')}</div>
        <div className='menu__links'>
          <NavLink to='/labels/privacy'>{t('menu.privacy', 'Privacy')}</NavLink>
        </div>
      </div>
    </div>
  )
}

export default function Menu({ hide, hideSearch, hide_speed_dial }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

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
        <div className='settings__container'>
          <ChangeLocale />
        </div>
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
              tooltipTitle={t('menu.home', 'Home')}
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
        {!isHome && <ChangeLocale />}
      </div>
    </div>
  )
}

Menu.propTypes = {
  hide: PropTypes.bool,
  hideSearch: PropTypes.bool,
  hide_speed_dial: PropTypes.bool
}
