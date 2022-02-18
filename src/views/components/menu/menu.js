import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer'
import CloseIcon from '@material-ui/icons/Close'
import SpeedDial from '@material-ui/lab/SpeedDial'
import SpeedDialAction from '@material-ui/lab/SpeedDialAction'
import HomeIcon from '@material-ui/icons/Home'

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
          <Link to='/introduction/basics'>Overview</Link>
          <Link to='/introduction/advantages'>Advantages</Link>
          <Link to='/introduction/how-it-works'>How it works</Link>
          <Link to='/introduction/why-it-matters'>Why it matters</Link>
          <Link to='/introduction/misconceptions'>Misconceptions</Link>
          <Link to='/introduction/investment-thesis'>Investment thesis</Link>
          <Link to='/history/overview'>History</Link>
          <Link to='/faqs'>FAQs</Link>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Guides</div>
        <div className='menu__links'>
          <Link to='/getting-started-users/basics'>Basics</Link>
          <Link to='/getting-started-users/storing/basics'>Storing</Link>
          <Link to='/getting-started-users/acquiring'>Acquiring</Link>
          <Link to='/getting-started-users/choosing-a-representative'>
            Choosing a Rep
          </Link>
          <Link to='/getting-started-users/using'>Using</Link>
          <Link to='/getting-started-users/storing/setup'>Account Setup</Link>
          <Link to='/getting-started-users/privacy'>Privacy</Link>
          <Link to='/getting-started-users/best-practices'>Best Practices</Link>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Learn</div>
        <div className='menu__links'>
          <Link to='/design/basics'>Design</Link>
          <Link to='/design/security'>Security</Link>
          <Link to='/design/attack-vectors'>Attack Vectors</Link>
          <Link to='/design/challenges'>Challenges</Link>
          <Link to='/design/roadmap'>Roadmap</Link>
          <Link to='/design/glossary'>Glossary</Link>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Developers</div>
        <div className='menu__links'>
          <Link to='/getting-started-devs/getting-started'>
            Getting Started
          </Link>
          <Link to='/getting-started-devs/running-a-node'>Running a node</Link>
          {/* <Link to='/getting-started-devs/tutorials/overview'>
              Tutorials
              </Link> */}
          <Link to='/getting-started-devs/documentation'>Documentation</Link>
          <Link to='/getting-started-devs/protocol-reference'>Protocol</Link>
          {/* <Link to='/getting-started-devs/integrations'>Integrations</Link> */}
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Get Involved</div>
        <div className='menu__links'>
          <Link to='/contributing'>Contributing</Link>
          <Link to='/community'>Discussions</Link>
          <Link to='/support'>Support</Link>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Stats</div>
        <div className='menu__links'>
          <Link to='/representatives'>Representatives</Link>
          <Link to='/ledger'>Ledger</Link>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Topics</div>
        <div className='menu__links'>
          <Link to='/tags/privacy'>Privacy</Link>
        </div>
      </div>
    </div>
  )
}

export default class Menu extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      open: false
    }
  }

  handleOpen = () => this.setState({ open: true })
  handleClose = () => this.setState({ open: false })
  handleClick = () => this.setState({ open: !this.state.open })
  handleHomeClick = () => history.push('/')

  render() {
    const { hide, hideSearch } = this.props
    const isHome = history.location.pathname === '/'
    const isMobile = window.innerWidth < 750

    return (
      <div className='menu__container'>
        <SwipeableDrawer
          open={this.state.open}
          onOpen={this.handleOpen}
          onClose={this.handleClose}
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
          anchor='top'>
          <MenuSections />
        </SwipeableDrawer>
        <SpeedDial
          className='menu__dial'
          ariaLabel='menu dial'
          transitionDuration={0}
          direction={isMobile ? 'up' : 'down'}
          onClick={this.handleClick}
          open={this.state.open}
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
              onClick={this.handleHomeClick}
            />
          )}
        </SpeedDial>
        <div className='menu__body'>
          {isHome ? (
            <div className='menu__text'>NANO</div>
          ) : (
            <Link to='/' className='menu__text'>
              NANO
            </Link>
          )}
          {!hideSearch && <SearchBar />}
          {!hide && <MenuSections />}
        </div>
      </div>
    )
  }
}

Menu.propTypes = {
  hide: PropTypes.bool,
  hideSearch: PropTypes.bool
}
