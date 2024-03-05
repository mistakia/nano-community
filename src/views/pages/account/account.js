import React, { useEffect } from 'react'
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
import { useTranslation } from 'react-i18next'

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

function TabPanel({ children, value, index, ...other }) {
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
  getAccount,
  account,
  showNotification
}) {
  const { t } = useTranslation()
  const [value, setValue] = React.useState(0)

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

  const handleClick = () => {
    const { address } = match.params
    copy(`nano_${address}`)
    showNotification({
      message: t('account_page.copy_notification', 'Account address copied'),
      severity: 'success'
    })
  }

  useEffect(() => {
    const { address } = match.params
    getAccount(`nano_${address}`)
  }, [match.params.address])

  const isLoading = account.get('is_loading')
  const isOpened = account.getIn(['account_meta', 'block_count'])

  return (
    <>
      <Seo
        title={t('account_page.seo_title', 'Nano Account')}
        description={t(
          'account_page.seo_description',
          'Information for nano representative'
        )}
        tags={['nano', 'representatives', 'network', 'account']}
      />
      <div className='account__container'>
        <div className='account__alias'>
          <h1>{account.alias}</h1>
        </div>
        <div className='account__head'>
          <div className='account__section account__address'>
            <span className='section__label'>
              {t('account_page.address', 'Account Address')}
            </span>
            <div>
              {account.account || <Skeleton animation='wave' width='90%' />}
            </div>
            {!isLoading && (
              <Tooltip title={t('common.click_to_copy', 'click to copy')}>
                <IconButton className='section__copy' onClick={handleClick}>
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
            color='secondary'
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
            <Collapsible
              title={t('account_page.telemetry_charts', 'Telemetry Charts')}>
              <div className='representative__metrics'>
                <Tabs
                  orientation='horizontal'
                  variant='scrollable'
                  value={value}
                  className='representative__metrics-menu'
                  onChange={handleChange}>
                  <Tab label={t('common.conf_short', 'Conf.')} />
                  <Tab label={t('common.conf_diff_short', 'Conf. Diff')} />
                  <Tab label={t('common.blocks', 'Blocks')} />
                  <Tab label={t('common.blocks_diff_short', 'Blocks Diff')} />
                  <Tab label={t('common.unchecked', 'Unchecked')} />
                  <Tab label={t('common.peers', 'Peers')} />
                  <Tab
                    label={t('common.account', {
                      count: 2,
                      defaultValue: 'Accounts'
                    })}
                  />
                </Tabs>
                <TabPanel value={value} index={0}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='cemented_count'
                    label={t('common.blocks', 'Blocks')}
                  />
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='cemented_behind'
                    label={t('common.blocks', 'Blocks')}
                  />
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='block_count'
                    label={t('common.blocks', 'Blocks')}
                  />
                </TabPanel>
                <TabPanel value={value} index={3}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='block_behind'
                    label={t('common.blocks', 'Blocks')}
                  />
                </TabPanel>
                <TabPanel value={value} index={4}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='unchecked_count'
                    label={t('common.blocks', 'Blocks')}
                  />
                </TabPanel>
                <TabPanel value={value} index={5}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='peer_count'
                    label={t('common.peers', 'Peers')}
                  />
                </TabPanel>
                <TabPanel value={value} index={6}>
                  <RepresentativeTelemetryChart
                    account={account}
                    stat='account_count'
                    label={t('common.account', {
                      count: 2,
                      defaultValue: 'Accounts'
                    })}
                  />
                </TabPanel>
              </div>
            </Collapsible>
            <Collapsible
              title={t('common.delegator', {
                count: 2,
                defaultValue: 'Delegators'
              })}>
              <RepresentativeDelegators
                account={account}
                address={`nano_${match.params.address}`}
              />
            </Collapsible>
          </div>
        )}
        {!isLoading && !isOpened ? (
          <div className='account__unopened account__section'>
            <h2>
              {t(
                'account_page.unopened_title',
                "This account hasn't been opened yet"
              )}
            </h2>
            <p>
              {t(
                'account_page.unopened_description',
                "While the account address is valid, no blocks have been observed. If NANO has been sent to this account, it still needs to publish a corresponding block to receive the funds and establish an opening balance. An account's balance can only be updated by the account holder as they are the only ones who can publish blocks to their chain."
              )}
            </p>
            <p>
              {t(
                'account_page.unopened_note',
                'If an opening block has already been published, it may take a few moments to spread through the network and be observed by the nano.community nodes.'
              )}
            </p>
          </div>
        ) : (
          !isLoading && (
            <>
              {Boolean(!account.representative) && (
                <AccountMeta account={account} />
              )}
              <Collapsible title={t('common.send_summary', 'Send Summary')}>
                <AccountBlocksSummary
                  type='send'
                  accountLabel={t('common.receiving_account', 'Receiving')}
                  account={account}
                />
              </Collapsible>

              {/* <AccountBlocksSummary type='receive' accountLabel='Sending' account={account} /> */}
              <Collapsible
                title={t('account_page.change_summary', 'Change Summary')}>
                <AccountBlocksSummary
                  type='change'
                  accountLabel={t('common.representative', {
                    count: 1,
                    defaultValue: 'Representative'
                  })}
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

AccountPage.propTypes = {
  match: PropTypes.object,
  getAccount: PropTypes.func,
  account: ImmutablePropTypes.record,
  showNotification: PropTypes.func
}
