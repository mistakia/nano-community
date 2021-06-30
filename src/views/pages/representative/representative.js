import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'

import RepresentativeUptime from '@components/representative-uptime'
import RepresentativeNetwork from '@components/representative-network'
import RepresentativeConfirmationsBehind from '@components/representative-confirmations-behind'
import RepresentativeBlocksBehind from '@components/representative-blocks-behind'
import RepresentativePeers from '@components/representative-peers'

import Seo from '@components/seo'
import Menu from '@components/menu'

import './representative.styl'

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

export default class RepresentativePage extends React.Component {
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
    this.props.getRepresentative(`nano_${address}`)
  }

  render() {
    const { account } = this.props
    return (
      <>
        <Seo
          title='Nano Representative'
          description='Information for nano representative'
          tags={['nano', 'representatives', 'network', 'account']}
        />
        <div className='representative__body'>
          {Boolean(account.alias) && (
            <div className='representative__alias'>
              <h1>{account.alias}</h1>
            </div>
          )}
          <div className='representative__section'>
            <div>{account.account}</div>
          </div>
          <div className='representative__section'>
            <div>{BigNumber(account.account_meta.balance).toFixed()}</div>
          </div>
          <RepresentativeUptime account={account} />
          <RepresentativeNetwork account={account} />
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
        </div>
        <div className='representative__footer'>
          <Menu desktop />
        </div>
      </>
    )
  }
}

RepresentativePage.propTypes = {
  match: PropTypes.object,
  getRepresentative: PropTypes.func,
  account: ImmutablePropTypes.record
}
