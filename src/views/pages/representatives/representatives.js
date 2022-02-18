import React from 'react'
import PropTypes from 'prop-types'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'

import Seo from '@components/seo'
import Menu from '@components/menu'
import Representatives from '@components/representatives'
import RepresentativesOffline from '@components/representatives-offline'
import RepresentativesWeight from '@components/representatives-weight'
import RepresentativesSearch from '@components/representatives-search'
import RepresentativesFilters from '@components/representatives-filters'
import RepresentativesCementedByWeight from '@components/representatives-cemented-by-weight'
import RepresentativesCheckedByWeight from '@components/representatives-checked-by-weight'
import RepresentativesProviderByWeight from '@components/representatives-provider-by-weight'
import RepresentativesCountryByWeight from '@components/representatives-country-by-weight'
import RepresentativesVersionByWeight from '@components/representatives-version-by-weight'
import RepresentativesBandwidthByWeight from '@components/representatives-bandwidth-by-weight'
import RepresentativesClusterCharts from '@components/representatives-cluster-charts'
import RepresentativesWeightChart from '@components/representatives-weight-chart'
import RepresentativesQuorumCharts from '@components/representatives-quorum-charts'

import './representatives.styl'

function TabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div
      className='representatives__metric'
      hidden={value !== index}
      {...other}>
      {value === index && children}
    </div>
  )
}

TabPanel.propTypes = {
  children: PropTypes.element,
  value: PropTypes.number,
  index: PropTypes.number
}

export default class RepresentativesPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      value: 0
    }
  }

  handleChange = (event, value) => {
    this.setState({ value })
  }

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
        <RepresentativesWeight />
        <div className='representatives__header'>
          <RepresentativesCementedByWeight />
          <RepresentativesCheckedByWeight />
          <RepresentativesBandwidthByWeight />
          <RepresentativesProviderByWeight />
          <RepresentativesVersionByWeight />
          <RepresentativesCountryByWeight />
        </div>
        <div className='representatives__body'>
          <RepresentativesSearch />
          <RepresentativesFilters />
          <Representatives />
          <div className='representatives__metrics'>
            <Tabs
              orientation={window.innerWidth < 600 ? 'horizontal' : 'vertical'}
              variant='scrollable'
              value={this.state.value}
              className='representatives__metrics-menu'
              onChange={this.handleChange}>
              <Tab label='Telemetry' />
              <Tab label='Weight Distribution' />
              <Tab label='Weight History' />
              <Tab label='Offline Reps' />
            </Tabs>
            <TabPanel value={this.state.value} index={0}>
              <RepresentativesClusterCharts />
            </TabPanel>
            <TabPanel value={this.state.value} index={1}>
              <RepresentativesWeightChart />
            </TabPanel>
            <TabPanel value={this.state.value} index={2}>
              <RepresentativesQuorumCharts />
            </TabPanel>
            <TabPanel value={this.state.value} index={3}>
              <RepresentativesOffline />
            </TabPanel>
          </div>
        </div>
        <div className='representatives__footer'>
          <Menu />
        </div>
      </>
    )
  }
}
