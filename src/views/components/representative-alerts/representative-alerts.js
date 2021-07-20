import React from 'react'
import ImmutablePropTypes from 'react-immutable-proptypes'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import { Link } from 'react-router-dom'
import Tooltip from '@material-ui/core/Tooltip'
import HelpOutlineIcon from '@material-ui/icons/HelpOutline'

import './representative-alerts.styl'

const getTooltipText = (type) => {
  switch (type) {
    case 'Offline':
      return 'Representative has stopped voting and appears offline.'

    case 'Behind':
      return 'Representative has fallen behind or is bootstrapping. The cutoff is a cemented count beyond the 95th percentile. (via telemetry)'

    case 'Overweight':
      return "Representative has beyond 3M Nano voting weight. Delegators should consider distributing the weight to improve the network's resilience and value."

    case 'Low Uptime':
      return 'Representative has been offline more than 25% in the last 28 days.'
  }
}

function Section({ items, title, level, onlineWeight }) {
  return (
    <div className={`representatives__alert-section ${level}`}>
      <div className='rep__alert-title'>{title}</div>
      <Tooltip title={getTooltipText(title)} className='metric__card-tooltip'>
        <HelpOutlineIcon />
      </Tooltip>
      <div className='rep__alert-rows'>
        {items.map((i, idx) => (
          <div className='rep__alert-row' key={idx}>
            <div>
              <Link to={`/${i.account}`}>
                {i.alias || `${i.account.slice(0, 15)}...`}
              </Link>
            </div>
            <div className='rep__alert-row-pct'>
              {i.account_meta.weight && onlineWeight
                ? `${BigNumber(i.account_meta.weight)
                    .dividedBy(onlineWeight)
                    .multipliedBy(100)
                    .toFormat(2)} %`
                : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

Section.propTypes = {
  items: ImmutablePropTypes.list,
  title: PropTypes.string,
  level: PropTypes.string,
  onlineWeight: PropTypes.number
}

export default class RepresentativeAlerts extends React.Component {
  render() {
    const {
      offline,
      behind,
      overweight,
      lowUptime,
      isLoading,
      onlineWeight
    } = this.props

    return (
      <div className='representatives__alerts'>
        <Section
          items={offline}
          title='Offline'
          level='error'
          onlineWeight={onlineWeight}
        />
        <Section
          items={behind}
          title='Behind'
          level='warning'
          onlineWeight={onlineWeight}
        />
        <Section
          items={lowUptime}
          title='Low Uptime'
          level='warning'
          onlineWeight={onlineWeight}
        />
        <Section
          items={overweight}
          title='Overweight'
          level='info'
          onlineWeight={onlineWeight}
        />
      </div>
    )
  }
}

RepresentativeAlerts.propTypes = {
  offline: ImmutablePropTypes.list,
  overweight: ImmutablePropTypes.list,
  lowUptime: ImmutablePropTypes.list,
  behind: ImmutablePropTypes.list,
  isLoading: PropTypes.bool,
  onlineWeight: PropTypes.number
}
