import React from 'react'
import { Link } from 'react-router-dom'

import RepresentativeAlerts from '@components/representative-alerts'
import CommunityFeed from '@components/community-feed'
import Network from '@components/network'
import GithubEvents from '@components/github-events'
import Menu from '@components/menu'
import Seo from '@components/seo'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <div className='home__container'>
        <Seo
          title='Nano Community'
          description='Nano is digital money that settles in under a second with no fees. Guides for making your first payment, live network stats, and community news.'
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
          <h1 className='home__intro-title'>
            Digital money that settles in under a second, with no fees.
          </h1>
          <p className='home__intro-text'>
            Nano is a peer-to-peer currency run by an open network of
            community-chosen representatives. Send any amount, anywhere, and the
            recipient gets all of it.
          </p>
          <div className='home__intro-actions'>
            <Link
              className='home__intro-action primary'
              to='/getting-started-users/first-payment'>
              Make your first payment
            </Link>
            <Link
              className='home__intro-action'
              to='/introduction/how-it-works'>
              How it works
            </Link>
          </div>
        </div>
        <div className='home__body'>
          <div className='home__sections'>
            <Network />
            <GithubEvents />
          </div>
          <CommunityFeed />
          <RepresentativeAlerts />
        </div>
        <div className='home__footer'>
          <Menu />
        </div>
      </div>
    )
  }
}
