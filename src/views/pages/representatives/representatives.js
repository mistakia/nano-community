import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useTranslation } from 'react-i18next'

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

function TabPanel({ children, value, index, ...other }) {
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

export default function RepresentativesPage() {
  const { t } = useTranslation()
  const [value, setValue] = useState(0)

  const handleChange = (event, value) => {
    setValue(value)
  }

  return (
    <>
      <Seo
        title={t('representatives_page.seo_title', 'Nano Representatives')}
        description={t(
          'representatives_page.seo_description',
          'Nano representative explorer'
        )}
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
        <div className='representatives__body-header'>
          <RepresentativesSearch align='left' />
          <RepresentativesFilters />
        </div>
        <Representatives />
        <div className='representatives__metrics'>
          <Tabs
            orientation={window.innerWidth < 600 ? 'horizontal' : 'vertical'}
            variant='scrollable'
            value={value}
            className='representatives__metrics-menu'
            onChange={handleChange}>
            <Tab label={t('representatives_page.telemetry_tab', 'Telemetry')} />
            <Tab
              label={t(
                'representatives_page.weight_distribution_tab',
                'Weight Distribution'
              )}
            />
            <Tab
              label={t(
                'representatives_page.weight_history_tab',
                'Weight History'
              )}
            />
            <Tab
              label={t('representatives_page.offline_reps_tab', 'Offline Reps')}
            />
          </Tabs>
          <TabPanel value={value} index={0}>
            <RepresentativesClusterCharts />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <RepresentativesWeightChart />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <RepresentativesQuorumCharts />
          </TabPanel>
          <TabPanel value={value} index={3}>
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
