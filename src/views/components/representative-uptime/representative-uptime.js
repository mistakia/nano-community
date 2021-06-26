import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'

import Uptime from '@components/uptime'

export default class RepresentativeUptime extends React.Component {
  render() {
    const { uptime } = this.props.account.toJS()

    return (
      <div className='representative__section'>
        <Uptime data={uptime} />
      </div>
    )
  }
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
