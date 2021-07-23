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
      <div className='section__row' key={idx}>
        <div className='section__row-label'>{i.label}</div>
        <div className='section__row-value'>{i.value}</div>
      </div>
    ))

    return (
      <div className='representative__section representative__network'>
        <div className='section__heading'>
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
