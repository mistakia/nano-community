import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'
import BigNumber from 'bignumber.js'

import RepresentativeUptime from '@components/representative-uptime'
import RepresentativeNetwork from '@components/representative-network'
import RepresentativeConfirmationsBehind from '@components/representative-confirmations-behind'
import RepresentativeBlocksBehind from '@components/representative-blocks-behind'
import RepresentativePeers from '@components/representative-peers'

import Seo from '@components/seo'
import Menu from '@components/menu'

import './representative.styl'

export default class RepresentativePage extends React.Component {
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
          <div className='representative__section'>
            <div>{account.account}</div>
          </div>
          {Boolean(account.alias) && (
            <div className='representative__section'>
              <div>{account.alias}</div>
            </div>
          )}
          <div className='representative__section'>
            <div>
              {BigNumber(account.account_meta.balance)
                .shiftedBy(-30)
                .toFormat(3)}
            </div>
          </div>
          <RepresentativeUptime account={account} />
          <RepresentativeNetwork account={account} />
          <RepresentativeConfirmationsBehind account={account} />
          <RepresentativeBlocksBehind account={account} />
          <RepresentativePeers account={account} />
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
