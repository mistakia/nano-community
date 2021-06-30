import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getGithub } from '@core/github'

import Github from './github'

const mapStateToProps = createSelector(getGithub, (events) => {
  // 48 hours ago
  const cutoff = Math.round(Date.now() / 1000) - 172800
  const filtered = events.filter((p) => p.created_at > cutoff)

  return { events: filtered.size < 15 ? events.slice(0, 15) : filtered }
})

export default connect(mapStateToProps)(Github)
