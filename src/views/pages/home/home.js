import React from 'react'

import Posts from '@components/posts'
import Network from '@components/network'
import Menu from '@components/menu'
import Seo from '@components/seo'

import './home.styl'

export default class HomePage extends React.Component {
  render() {
    return (
      <>
        <Seo
          title='Nano Community'
          description='Nano community gateway and wiki knowledge hub. Nano is digital money (cryptocurrency) that is peer-to-peer, feeless, instant, green and energy sustainable.'
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
            'green',
            'sustainable'
          ]}
        />
        <div className='posts'>
          <div className='posts__title'>Posts from the community</div>
          <Posts title='Top' id='top' age={168} />
          <Menu mobile />
          <Posts title='Trending' id='trending' age={72} />
        </div>
        <div className='posts__side'>
          <Menu desktop />
          <Network />
        </div>
      </>
    )
  }
}
