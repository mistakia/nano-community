import React from 'react'

import Seo from '@components/seo'
import Menu from '@components/menu'

export default class NetworkPage extends React.Component {
  render() {
    return (
      <>
        <Seo
          title='Nano Network'
          description='Nano network and ledger explorer'
          tags={[
            'nano',
            'network',
            'ledger',
            'crypto',
            'currency',
            'cryptocurrency',
            'digital',
            'money',
            'feeless',
            'energy',
            'green',
            'sustainable'
          ]}
        />
        <h1>Network</h1>
        <div className='network__footer'>
          <Menu desktop />
        </div>
      </>
    )
  }
}
