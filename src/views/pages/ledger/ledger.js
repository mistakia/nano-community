import React from 'react'
import PropTypes from 'prop-types'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'

import LedgerChartBlocks from '@components/ledger-chart-blocks'
import LedgerChartAddresses from '@components/ledger-chart-addresses'
import LedgerChartVolume from '@components/ledger-chart-volume'
import LedgerChartAmounts from '@components/ledger-chart-amounts'
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

export default class LedgerPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      value: 0
    }
  }

  handleChange = (event, value) => {
    this.setState({ value })
  }

  componentDidMount() {
    this.props.load()
  }

  render() {
    const { data, isLoading } = this.props

    return (
      <>
        <Seo
          title='Nano Ledger Analysis'
          description='On-chain metrics and analytics of the Nano ledger'
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
            value={this.state.value}
            onChange={this.handleChange}>
            <Tab label='Addresses' />
            <Tab label='Blocks' />
            <Tab label='Volume' />
            <Tab label='Amounts' />
          </Tabs>
          <TabPanel value={this.state.value} index={0}>
            <LedgerChartAddresses data={data} isLoading={isLoading} />
          </TabPanel>
          <TabPanel value={this.state.value} index={1}>
            <LedgerChartBlocks data={data} isLoading={isLoading} />
          </TabPanel>
          <TabPanel value={this.state.value} index={2}>
            <LedgerChartVolume data={data} isLoading={isLoading} />
          </TabPanel>
          <TabPanel value={this.state.value} index={3}>
            <LedgerChartAmounts data={data} isLoading={isLoading} />
          </TabPanel>
        </div>
        <div className='ledger__footer'>
          <Menu />
        </div>
      </>
    )
  }
}

LedgerPage.propTypes = {
  load: PropTypes.func,
  data: PropTypes.object,
  isLoading: PropTypes.bool
}
