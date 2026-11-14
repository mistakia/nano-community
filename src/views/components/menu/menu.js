import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import SearchBar from '@components/search-bar'

import './menu.styl'

const PANEL_ID = 'menu-panel'
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function MenuIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' className='menu__trigger-icon'>
      <path d='M3 6h18M3 12h18M3 18h18' />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' className='menu__trigger-icon'>
      <path d='M6 6l12 12M18 6L6 18' />
    </svg>
  )
}

export function MenuSections() {
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
          <NavLink to='/getting-started-users/first-payment'>
            First Payment
          </NavLink>
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
          <NavLink to='/getting-started-devs/tools'>Tools</NavLink>
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
          <NavLink to='/network-events'>Network Events</NavLink>
          <NavLink to='/ledger'>Ledger</NavLink>
          <NavLink to='/network-energy-usage'>Energy Usage</NavLink>
        </div>
      </div>
      <div className='menu__section'>
        <div className='menu__heading'>Topics</div>
        <div className='menu__links'>
          <NavLink to='/labels/privacy'>Privacy</NavLink>
          <NavLink to='/privacy'>Privacy policy</NavLink>
        </div>
      </div>
    </div>
  )
}

export default function Menu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const trigger_ref = useRef(null)
  const panel_ref = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) {
      return
    }

    const trigger = trigger_ref.current
    const previous_body_overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const first_panel_control =
      panel_ref.current.querySelector(FOCUSABLE_SELECTOR)
    if (first_panel_control) {
      first_panel_control.focus()
    }

    const handle_key_down = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      // keep focus cycling through the trigger and the panel while open
      const focusable_controls = [
        trigger,
        ...panel_ref.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ]
      const first_control = focusable_controls[0]
      const last_control = focusable_controls[focusable_controls.length - 1]

      if (event.shiftKey && document.activeElement === first_control) {
        event.preventDefault()
        last_control.focus()
      } else if (!event.shiftKey && document.activeElement === last_control) {
        event.preventDefault()
        first_control.focus()
      }
    }

    document.addEventListener('keydown', handle_key_down)

    return () => {
      document.removeEventListener('keydown', handle_key_down)
      document.body.style.overflow = previous_body_overflow
      trigger.focus()
    }
  }, [open])

  return (
    <>
      <button
        ref={trigger_ref}
        type='button'
        className='menu__trigger'
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen(!open)}>
        {open ? <CloseIcon /> : <MenuIcon />}
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <>
          <div className='menu__backdrop' onClick={() => setOpen(false)} />
          <div
            ref={panel_ref}
            id={PANEL_ID}
            className='menu__panel'
            role='dialog'
            aria-modal='true'
            aria-label='Site menu'>
            <div className='menu__panel-header'>
              <NavLink to='/' className='menu__wordmark'>
                NANO
              </NavLink>
              <SearchBar />
            </div>
            <MenuSections />
          </div>
        </>
      )}
    </>
  )
}
