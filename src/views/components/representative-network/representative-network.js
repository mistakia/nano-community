import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'

export default class RepresentativeNetwork extends React.Component {
  render() {
    const { account } = this.props

    const items = [
      {
        label: 'Provider',
        value: account.getIn(['network', 'asname'])
      },
      {
        label: 'ISP',
        value: account.getIn(['network', 'isp'])
      },
      {
        label: 'Country',
        value: account.getIn(['network', 'country'])
      },
      {
        label: 'City',
        value: account.getIn(['network', 'city'])
      }
    ]

    const rows = items.map((i, idx) => (
      <div className='account__section-row' key={idx}>
        <div className='account__section-row-label'>{i.label}</div>
        <div className='account__section-row-value'>{i.value}</div>
      </div>
    ))

    return (
      <div className='representative__section representative__network'>
        <div className='account__section-heading'>
          <span>Network</span>
        </div>
        {rows}
      </div>
    )
  }
}

RepresentativeNetwork.propTypes = {
  account: ImmutablePropTypes.record
}
