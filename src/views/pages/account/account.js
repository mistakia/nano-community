import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
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
import AccountBalanceHistory from '@components/account-balance-history'
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

export default function AccountPage({
  match,
  showNotification,
  getAccount,
  get_account_stats,
  account
}) {
  const [value, setValue] = useState(0)

  const handleChange = (event, value) => {
    setValue(value)
  }

  const handleClick = () => {
    const { address } = match.params
    copy(`nano_${address}`)
    showNotification({
      message: 'Account address copied',
      severity: 'success'
    })
  }

  useEffect(() => {
    const { address } = match.params
    getAccount(`nano_${address}`)
    get_account_stats(`nano_${address}`)
  }, [match.params.address])

  const is_loaded = account.get('account_is_loaded')
  const is_loading = account.get('account_is_loading')
  const is_loading_open = account.get('account_is_loading_open')
  const is_opened = account.getIn(['account_meta', 'block_count'])

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
            {is_loaded && (
              <Tooltip title='click to copy'>
                <IconButton className='section__copy' onClick={handleClick}>
                  <FilterNoneIcon />
                </IconButton>
              </Tooltip>
            )}
          </div>
          <div className='account__section account__balance'>
            {is_loaded ? (
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
        <div style={{ minHeight: '4px', width: '100%', marginBottom: '16px' }}>
          {(!is_loaded || is_loading || is_loading_open) && (
            <LinearProgress color='error' style={{ width: '100%' }} />
          )}
        </div>
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
              {is_loading ? (
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <CircularProgress />
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <div className='representative__metrics'>
                  <Tabs
                    orientation='horizontal'
                    variant='scrollable'
                    value={value}
                    className='representative__metrics-menu'
                    onChange={handleChange}>
                    <Tab label='Conf.' />
                    <Tab label='Conf. Diff' />
                    <Tab label='Blocks' />
                    <Tab label='Blocks Diff' />
                    <Tab label='Unchecked' />
                    <Tab label='Peer Count' />
                    <Tab label='Accounts' />
                  </Tabs>
                  <TabPanel value={value} index={0}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='cemented_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={1}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='cemented_behind'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={2}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='block_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={3}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='block_behind'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={4}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='unchecked_count'
                      label='Blocks'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={5}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='peer_count'
                      label='Peers'
                    />
                  </TabPanel>
                  <TabPanel value={value} index={6}>
                    <RepresentativeTelemetryChart
                      account={account}
                      stat='account_count'
                      label='Accounts'
                    />
                  </TabPanel>
                </div>
              )}
            </Collapsible>
            <Collapsible title='Delegators'>
              <RepresentativeDelegators
                account={account}
                address={`nano_${match.params.address}`}
              />
            </Collapsible>
          </div>
        )}
        {is_loaded && !is_opened ? (
          <div className='account__unopened account__section'>
            <h2>This account hasn&apos;t been opened yet</h2>
            <p>
              While the account address is valid, no blocks have been observed.
              If NANO has been sent to this account, it still needs to publish a
              corresponding block to receive the funds and establish an opening
              balance. An accounts balance can only be updated by the account
              holder as they are the only ones who can publish blocks to their
              chain.
            </p>
            <p>
              If an opening block has already been published, it may take a few
              moments to spread through the network and be observed by the
              nano.community nodes.
            </p>
          </div>
        ) : (
          is_loaded && (
            <>
              {Boolean(!account.representative) && (
                <AccountMeta account={account} />
              )}
              <Collapsible title='Balance History' only_render_when_visible>
                <AccountBalanceHistory account={account} />
              </Collapsible>
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
      {is_loaded && (
        <div className='account__footer'>
          <Menu />
        </div>
      )}
    </>
  )
}

AccountPage.propTypes = {
  match: PropTypes.object,
  getAccount: PropTypes.func,
  get_account_stats: PropTypes.func,
  account: ImmutablePropTypes.record,
  showNotification: PropTypes.func
}
