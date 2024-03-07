import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import FilterNoneIcon from '@mui/icons-material/FilterNone'
import IconButton from '@mui/material/IconButton'
import copy from 'copy-text-to-clipboard'
import Tooltip from '@mui/material/Tooltip'

import RepresentativeTelemetryChart from '@components/representative-telemetry-chart'
import RepresentativeDelegators from '@components/representative-delegators'
import RepresentativeUptime from '@components/representative-uptime'
import RepresentativeInfo from '@components/representative-info'
import RepresentativeNetwork from '@components/representative-network'
import RepresentativeTelemetry from '@components/representative-telemetry'
import DisplayNano from '@components/display-nano'
import Collapsible from '@components/collapsible'

import AccountMeta from '@components/account-meta'
import AccountBlocksSummary from '@components/account-blocks-summary'

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

  handleClick = () => {
    const { address } = this.props.match.params
    copy(`nano_${address}`)
    this.props.showNotification({
      message: 'Account address copied',
      severity: 'success'
    })
  }

  componentDidMount() {
    const { address } = this.props.match.params
    this.props.getAccount(`nano_${address}`)
  }

  componentDidUpdate(prevProps) {
    const { address } = this.props.match.params
    const prevAddress = prevProps.match.params.address
    if (address !== prevAddress) {
      this.props.getAccount(`nano_${address}`)
    }
  }

  render() {
    const { account } = this.props

    const isLoading = account.get('is_loading')
    const isOpened = account.getIn(['account_meta', 'block_count'])

    return (
      <>
        <Seo
          title='Nano Account'
          description='Information for nano representative'
          tags={['nano', 'representatives', 'network', 'account']}
        />
        <div className='account__container'>
          <div className='account__alias'>
            <h1>{account.alias}</h1>
          </div>
          <div className='account__head'>
            <div className='account__section account__address'>
              <span className='section__label'>Account Address</span>
              <div>
                {account.account || <Skeleton animation='wave' width='90%' />}
              </div>
              {!isLoading && (
                <Tooltip title='click to copy'>
                  <IconButton
                    className='section__copy'
                    onClick={this.handleClick}>
                    <FilterNoneIcon />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            <div className='account__section account__balance'>
              {!isLoading ? (
                <div className='account__balance-nano'>
                  <DisplayNano
                    value={account.getIn(['account_meta', 'balance'])}
                  />
                </div>
              ) : (
                <Skeleton animation='wave' width='90%' />
              )}
            </div>
          </div>
          {isLoading && (
            <LinearProgress
              color='error'
              style={{ width: '100%', margin: '32px' }}
            />
          )}
          {Boolean(account.representative) && (
            <div className='representative__container'>
              <div className='representative__head'>
                <RepresentativeInfo account={account} />
                <RepresentativeUptime account={account} />
              </div>
              <AccountMeta account={account} />
              <RepresentativeNetwork account={account} />
              <RepresentativeTelemetry account={account} />
              <Collapsible title='Telemetry Charts'>
                <div className='representative__metrics'>
                  <Tabs
                    orientation='horizontal'
                    variant='scrollable'
                    value={this.state.value}
                    className='representative__metrics-menu'
                    onChange={this.handleChange}>
                    <Tab label='Conf.' />
                    <Tab label='Conf. Diff' />
                    <Tab label='Blocks' />
                    <Tab label='Blocks Diff' />
                    <Tab label='Unchecked' />
                    <Tab label='Peer Count' />
                    <Tab label='Accounts' />
                  </Tabs>
                  <TabPanel value={this.state.value} index={0}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='cemented_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={1}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='cemented_behind'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={2}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='block_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={3}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='block_behind'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={4}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='unchecked_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={5}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='peer_count'
                      label='Peers'
                    />
                  </TabPanel>
                  <TabPanel value={this.state.value} index={6}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='account_count'
                      label='Accounts'
                    />
                  </TabPanel>
                </div>
              </Collapsible>
              <Collapsible title='Delegators'>
                <RepresentativeDelegators
                  account={account}
                  address={`nano_${this.props.match.params.address}`}
                />
              </Collapsible>
            </div>
          )}
          {!isLoading && !isOpened ? (
            <div className='account__unopened account__section'>
              <h2>This account hasn&apos;t been opened yet</h2>
              <p>
                While the account address is valid, no blocks have been
                observed. If NANO has been sent to this account, it still needs
                to publish a corresponding block to receive the funds and
                establish an opening balance. An accounts balance can only be
                updated by the account holder as they are the only ones who can
                publish blocks to their chain.
              </p>
              <p>
                If an opening block has already been published, it may take a
                few moments to spread through the network and be observed by the
                nano.community nodes.
              </p>
            </div>
          ) : (
            !isLoading && (
              <>
                {Boolean(!account.representative) && (
                  <AccountMeta account={account} />
                )}
                <Collapsible title='Send Summary'>
                  <AccountBlocksSummary
                    type='send'
                    accountLabel='Receiving'
                    account={account}
                  />
                </Collapsible>

                {/* <AccountBlocksSummary type='receive' accountLabel='Sending' account={account} /> */}
                <Collapsible title='Change Summary'>
                  <AccountBlocksSummary
                    type='change'
                    accountLabel='Representative'
                    account={account}
                  />
                </Collapsible>
              </>
            )
          )}
        </div>
        {!isLoading && (
          <div className='account__footer'>
            <Menu />
          </div>
        )}
      </>
    )
  }
}

AccountPage.propTypes = {
  match: PropTypes.object,
  getAccount: PropTypes.func,
  account: ImmutablePropTypes.record,
  showNotification: PropTypes.func
}
