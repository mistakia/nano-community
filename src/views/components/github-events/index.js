import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getGithubEvents } from '@core/github-events'

import GithubEvents from './github-events'

const mapStateToProps = createSelector(getGithubEvents, (events) => {
  // match the height of the network stats column beside it
  return { events: events.slice(0, 12) }
})

export default connect(mapStateToProps)(GithubEvents)
