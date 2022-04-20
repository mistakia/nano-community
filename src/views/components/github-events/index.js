import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getGithubEvents } from '@core/github-events'

import GithubEvents from './github-events'

const mapStateToProps = createSelector(getGithubEvents, (events) => {
  // 48 hours ago
  const cutoff = Math.round(Date.now() / 1000) - 172800
  const filtered = events.filter((p) => p.created_at > cutoff)

  return { events: filtered.size < 15 ? events.slice(0, 15) : filtered }
})

export default connect(mapStateToProps)(GithubEvents)
