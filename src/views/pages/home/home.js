import React from 'react'

import Posts from '@components/posts'
import Network from '@components/network'
import Github from '@components/github'
import Menu from '@components/menu'
import Seo from '@components/seo'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <>
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
        <div className='posts'>
          <div className='posts__title'>Posts from the community</div>
          <Posts title='Top' id='top' age={168} />
          <Menu mobile />
          <Posts title='Announcements' id='announcements' age={36} />
          <Posts title='Trending' id='trending' age={72} />
        </div>
        <div className='posts__side'>
          <Menu desktop />
          <Network />
          <Github />
        </div>
      </>
    )
  }
}
