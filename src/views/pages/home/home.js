import React from 'react'
import { Link } from 'react-router-dom'
import Button from '@mui/material/Button'

import CommunityFeed from '@components/community-feed'
import Network from '@components/network'
import NetworkHighlights from '@components/network-highlights'
import GithubEvents from '@components/github-events'
import Menu, { MenuSections } from '@components/menu'
import Seo from '@components/seo'

import './home.styl'

// the combination that sets nano apart, one line each
const properties = [
  { title: 'Instant', text: 'Final in under a second.' },
  { title: 'Feeless', text: 'Every payment arrives in full.' },
  { title: 'Borderless', text: 'Send to anyone, anywhere, anytime.' },
  {
    title: 'Fixed Supply',
    text: '133 million. Fully distributed.'
  },
  {
    title: 'Self-Sovereign',
    text: 'No issuer. Controlled only by your key.'
  },
  { title: 'Sustainable', text: 'Secured by voting, not mining.' }
]

export default class HomePage extends React.Component {
  render() {
    return (
      <div className='home__container'>
        <Seo
          title='Nano Community'
          description='Send money like a message. Nano is instant, feeless, borderless, fixed in supply, and self-sovereign. Learn the basics, make your first payment, and watch the network live.'
          tags={[
            'nano',
            'wiki',
            'crypto',
            'currency',
            'cryptocurrency',
            'digital',
            'money',
            'feeless',
            'guide',
            'docs',
            'energy',
            'environmental',
            'green',
            'sustainable'
          ]}
        />
        <Menu hide />
        <div className='home__intro'>
          <h1 className='home__intro-title'>Send money like a message.</h1>
          <div className='home__intro-actions'>
            <Button
              variant='outlined'
              component={Link}
              to='/introduction/basics'>
              What is Nano
            </Button>
            <Button
              variant='outlined'
              component={Link}
              to='/getting-started-users/first-payment'>
              Make your first payment
            </Button>
          </div>
        </div>
        <div className='home__properties'>
          {properties.map(({ title, text }) => (
            <div className='home__property' key={title}>
              <div className='home__property-title'>{title}</div>
              <div className='home__property-text'>{text}</div>
            </div>
          ))}
        </div>
        <div className='home__highlights'>
          <NetworkHighlights />
        </div>
        <div className='home__body'>
          <div className='home__sections'>
            <Network />
            <GithubEvents />
          </div>
          <CommunityFeed />
        </div>
        <div className='home__footer'>
          <MenuSections />
        </div>
      </div>
    )
  }
}
