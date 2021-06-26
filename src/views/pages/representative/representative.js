import React from 'react'
import PropTypes from 'prop-types'
import ImmutablePropTypes from 'react-immutable-proptypes'

import RepresentativeUptime from '@components/representative-uptime'
import RepresentativeNetwork from '@components/representative-network'
import RepresentativeConfirmationsGraph from '@components/representative-confirmations-graph'

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
          <div className='representative__section'>{account.account}</div>
          <RepresentativeUptime account={account} />
          <RepresentativeNetwork account={account} />
          <RepresentativeConfirmationsGraph account={account} />
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
