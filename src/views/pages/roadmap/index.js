import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getGithubDiscussions,
  githubDiscussionsActions
} from '@core/github-discussions'

import RoadmapPage from './roadmap'

const mapStateToProps = createSelector(getGithubDiscussions, (state) => ({
  discussions: state.get('discussions'),
  isPending: state.get('isPending')
}))

const mapDispatchToProps = {
  load: githubDiscussionsActions.getGithubDiscussions
}

export default connect(mapStateToProps, mapDispatchToProps)(RoadmapPage)
