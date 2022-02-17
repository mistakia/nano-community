import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getGithubIssuesState, githubIssuesActions } from '@core/github-issues'

import RoadmapPage from './roadmap'

const mapStateToProps = createSelector(getGithubIssuesState, (state) => ({
  issues: state.get('issues'),
  isPending: state.get('isPending')
}))

const mapDispatchToProps = {
  load: githubIssuesActions.getGithubIssues
}

export default connect(mapStateToProps, mapDispatchToProps)(RoadmapPage)
