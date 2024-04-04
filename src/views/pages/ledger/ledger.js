import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useTranslation } from 'react-i18next'

import LedgerChartBlocks from '@components/ledger-chart-blocks'
import LedgerChartAddresses from '@components/ledger-chart-addresses'
import LedgerChartVolume from '@components/ledger-chart-volume'
import LedgerChartAmounts from '@components/ledger-chart-amounts'
import LedgerChartUSDTransferred from '@components/ledger-chart-usd-transferred'
import Seo from '@components/seo'
import Menu from '@components/menu'

import './ledger.styl'

function TabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div className='ledger__metric' hidden={value !== index} {...other}>
      {value === index && children}
    </div>
  )
}

TabPanel.propTypes = {
  children: PropTypes.element,
  value: PropTypes.number,
  index: PropTypes.number
}

export default function LedgerPage({ load, data, isLoading }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(0)

  useEffect(() => {
    load()
  }, [])

  const handleChange = (event, value) => {
    setValue(value)
  }

  return (
    <>
      <Seo
        title={t('ledger_page.seo_title', 'Nano Ledger Analysis')}
        description={t(
          'ledger_page.seo_description',
          'On-chain metrics and analytics of the Nano ledger'
        )}
        tags={[
          'nano',
          'ledger',
          'analytics',
          'chain',
          'on-chain',
          'analysis',
          'crypto',
          'blockchain',
          'data',
          'insights',
          'addresses',
          'active',
          'transactions'
        ]}
      />
      <div className='ledger__body'>
        <Tabs
          orientation={'horizontal'}
          className='ledger__body-menu'
          variant='scrollable'
          value={value}
          onChange={handleChange}>
          <Tab label={t('ledger_page.addresses_tab', 'Addresses')} />
          <Tab label={t('ledger_page.blocks_tab', 'Blocks')} />
          <Tab label={t('ledger_page.volume_tab', 'Volume')} />
          <Tab
            label={t('ledger_page.value_transferred_tab', 'Value Transferred')}
          />
          <Tab label={t('ledger_page.amounts_tab', 'Amounts')} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <LedgerChartAddresses data={data} isLoading={isLoading} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <LedgerChartBlocks data={data} isLoading={isLoading} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <LedgerChartVolume data={data} isLoading={isLoading} />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <LedgerChartUSDTransferred data={data} isLoading={isLoading} />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <LedgerChartAmounts data={data} isLoading={isLoading} />
        </TabPanel>
      </div>
      <div className='ledger__footer'>
        <Menu />
      </div>
    </>
  )
}

LedgerPage.propTypes = {
  load: PropTypes.func,
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
