import React from 'react'

import RepresentativeAlerts from '@components/representative-alerts'
import Posts from '@components/posts'
import Network from '@components/network'
import Github from '@components/github'
import Menu from '@components/menu'
import Seo from '@components/seo'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <div className='home__container'>
        <Seo
          title='Nano Community'
          description='Community gateway and knowledge hub for Nano: digital money (cryptocurrency) that is peer-to-peer, feeless, instant, and environmentally sustainable'
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
        <div className='home__body'>
          <Posts title='Top' id='top' age={168} />
          <Posts title='Nano Foundation' id='announcements' age={36} />
          <RepresentativeAlerts />
          <div className='home__sections'>
            <Network />
            <Github />
          </div>
          <Posts title='Trending' id='trending' age={72} />
        </div>
      </div>
    )
  }
}
