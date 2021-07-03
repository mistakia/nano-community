import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'

import Uptime from '@components/uptime'

export default class RepresentativeUptime extends React.Component {
  render() {
    const { uptime } = this.props.account.toJS()

    return (
      <div className='account__section representative__uptime'>
        <Uptime data={uptime} expanded />
      </div>
    )
  }
}

RepresentativeUptime.propTypes = {
  account: ImmutablePropTypes.record
}
