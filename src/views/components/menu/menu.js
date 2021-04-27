import React from 'react'
import { Link } from 'react-router-dom'

import Network from '@components/network'
import './menu.styl'

export default class Menu extends React.Component {
  render() {
    return (
      <div className='menu__container'>
        <div className='menu__sections'>
          <Link to='/' className='menu__logo'>
            <img src='/resources/nano+full.svg' />
          </Link>
          <div className='menu__section'>
            <div className='menu__heading'>Introduction</div>
            <div className='menu__links'>
              <Link to='/introduction/basics'>Basics</Link>
              <Link to='/introduction/advantages'>Advantages</Link>
              <Link to='/introduction/how-it-works'>How it works</Link>
              <Link to='/introduction/why-it-matters'>Why it matters</Link>
              <Link to='/introduction/misconceptions'>Misconceptions</Link>
              <Link to='/introduction/investment-thesis'>
                Investment thesis
              </Link>
              <Link to='/history/overview'>History</Link>
              <Link to='/faqs'>FAQs</Link>
            </div>
          </div>
          <div className='menu__section'>
            <div className='menu__heading'>Get Started</div>
            <div className='menu__links'>
              <Link to='/getting-started-users/basics'>Basics</Link>
              <Link to='/getting-started-users/storing/basics'>Storing</Link>
              <Link to='/getting-started-users/acquiring'>Acquiring</Link>
              <Link to='/getting-started-users/using'>Using</Link>
              <Link to='/getting-started-users/best-practices'>
                Best Practices
              </Link>
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
            </div>
          </div>
          <div className='menu__section'>
            <div className='menu__heading'>Developers</div>
            <div className='menu__links'>
              <Link to='/getting-started-devs/overview'>Getting Started</Link>
              <Link to='/getting-started-devs/running-a-node'>
                Running a node
              </Link>
              <Link to='/getting-started-devs/tutorials/overview'>
                Tutorials
              </Link>
              <Link to='/getting-started-devs/documentation'>
                Documentation
              </Link>
              <Link to='/getting-started-devs/integrations'>Integrations</Link>
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
        </div>
        <Network />
      </div>
    )
  }
}
