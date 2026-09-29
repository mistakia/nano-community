import React from 'react'
import { Link } from 'react-router-dom'
import Button from '@mui/material/Button'

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
          description='Send money like a message. Nano settles in under a second with no fees. Learn the basics, make your first payment, and watch the network live.'
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
          <p className='home__intro-text'>
            Nano settles in under a second, anywhere in the world. No fees, ever
            — what you send is what arrives.
          </p>
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
        <div className='home__body'>
          <div className='home__sections'>
            <Network />
            <GithubEvents />
          </div>
          <CommunityFeed />
        </div>
        <div className='home__footer'>
          <Menu />
        </div>
      </div>
    )
  }
}
