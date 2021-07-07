import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Skeleton from '@material-ui/lab/Skeleton'

import RepresentativeDelegators from '@components/representative-delegators'
import RepresentativeUptime from '@components/representative-uptime'
import RepresentativeNetwork from '@components/representative-network'
import RepresentativeTelemetry from '@components/representative-telemetry'
import RepresentativeConfirmationsBehind from '@components/representative-confirmations-behind'
import RepresentativeBlocksBehind from '@components/representative-blocks-behind'
import RepresentativePeers from '@components/representative-peers'

import Seo from '@components/seo'
import Menu from '@components/menu'

import './account.styl'

function TabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div className='representative__metric' hidden={value !== index} {...other}>
      {value === index && children}
    </div>
  )
}

TabPanel.propTypes = {
  children: PropTypes.element,
  value: PropTypes.number,
  index: PropTypes.number
}

export default class AccountPage extends React.Component {
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
    const { address } = this.props.match.params
    this.props.getAccount(`nano_${address}`)
  }

  render() {
    const { account } = this.props

    const balance = BigNumber(account.getIn(['account_meta', 'balance'], 0))
    // convert to Nano and split into integer and fractional
    const nanoBalance = balance.shiftedBy(-30).toFixed(2).split('.')

    return (
      <>
        <Seo
          title='Nano Account'
          description='Information for nano representative'
          tags={['nano', 'representatives', 'network', 'account']}
        />
        <div className='account__body'>
          <div className='account__alias'>
            <h1>{account.alias}</h1>
          </div>
          <div className='account__section account__address'>
            {account.account || <Skeleton animation='wave' width='90%' />}
          </div>
          <div className='account__section account__balance'>
            <div className='account__balance-nano'>
              <div className='account__balance-nano-integer'>
                {BigNumber(nanoBalance[0]).toFormat()}
              </div>
              <div className='account__balance-nano-fraction'>
                .{nanoBalance[1]}
              </div>
              <div className='account__balance-nano-unit'>nano</div>
            </div>
            <div className='account__balance-raw'>{balance.toFixed()}</div>
          </div>
          {Boolean(account.representative) && (
            <RepresentativeUptime account={account} />
          )}
          {Boolean(account.representative) && (
            <RepresentativeNetwork account={account} />
          )}
          {Boolean(account.representative) && (
            <RepresentativeTelemetry account={account} />
          )}
          {Boolean(account.representative) && (
            <div className='representative__metrics'>
              <Tabs
                orientation='vertical'
                variant='scrollable'
                value={this.state.value}
                className='representative__metrics-menu'
                onChange={this.handleChange}>
                <Tab label='Conf. Diff' />
                <Tab label='Block Diff' />
                <Tab label='Peer Count' />
              </Tabs>
              <TabPanel value={this.state.value} index={0}>
                <RepresentativeConfirmationsBehind account={account} />
              </TabPanel>
              <TabPanel value={this.state.value} index={1}>
                <RepresentativeBlocksBehind account={account} />
              </TabPanel>
              <TabPanel value={this.state.value} index={2}>
                <RepresentativePeers account={account} />
              </TabPanel>
            </div>
          )}
          <RepresentativeDelegators
            account={account}
            address={`nano_${this.props.match.params.address}`}
          />
        </div>
        <div className='account__footer'>
          <Menu desktop />
        </div>
      </>
    )
  }
}

AccountPage.propTypes = {
  match: PropTypes.object,
  getAccount: PropTypes.func,
  account: ImmutablePropTypes.record
}
