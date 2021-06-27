import React from 'react'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Representatives from '@components/representatives'
import RepresentativesCementedByWeight from '@components/representatives-cemented-by-weight'
import RepresentativesCheckedByWeight from '@components/representatives-checked-by-weight'
import RepresentativesProviderByWeight from '@components/representatives-provider-by-weight'
import RepresentativesCountryByWeight from '@components/representatives-country-by-weight'
import RepresentativesVersionByWeight from '@components/representatives-version-by-weight'
import RepresentativesBandwidthByWeight from '@components/representatives-bandwidth-by-weight'
import RepresentativesConfirmationsPlot from '@components/representatives-confirmations-plot'

import './representatives.styl'

export default class RepresentativesPage extends React.Component {
  render() {
    return (
      <>
        <Seo
          title='Nano Representatives'
          description='Nano representative explorer'
          tags={[
            'nano',
            'representatives',
            'network',
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
        <div className='representatives__header'>
          <RepresentativesCementedByWeight />
          <RepresentativesCheckedByWeight />
          <RepresentativesBandwidthByWeight />
          <RepresentativesProviderByWeight />
          <RepresentativesVersionByWeight />
          <RepresentativesCountryByWeight />
        </div>
        <Representatives />
        <RepresentativesConfirmationsPlot />
        <div className='representatives__footer'>
          <Menu desktop />
        </div>
      </>
    )
  }
}
