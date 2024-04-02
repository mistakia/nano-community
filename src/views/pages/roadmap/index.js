import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  getGithubDiscussionsState,
  githubDiscussionsActions
} from '@core/github-discussions'
import { githubIssuesActions, getGithubIssuesState } from '@core/github-issues'

import RoadmapPage from './roadmap'

const sort_tasks = (a, b) => {
  const priorities = [
    'priority/critical',
    'priority/high',
    'priority/medium',
    'priority/low',
    'priority/none'
  ]
  const a_priority =
    a.labels.find((label) => priorities.includes(label.label_name))
      ?.label_name || 'priority/none'
  const b_priority =
    b.labels.find((label) => priorities.includes(label.label_name))
      ?.label_name || 'priority/none'
  return priorities.indexOf(a_priority) - priorities.indexOf(b_priority)
}

const mapStateToProps = createSelector(
  getGithubDiscussionsState,
  getGithubIssuesState,
  (discussions_state, issues_state) => {
    const github_issues = issues_state.get('issues')
    const in_progress_tasks = github_issues
      .filter((issue) =>
        issue.labels.some((label) => label.label_name === 'status/in-progress')
      )
      .sort(sort_tasks)
    const planned_tasks = github_issues
      .filter((issue) =>
        issue.labels.some((label) => label.label_name === 'status/ready')
      )
      .sort(sort_tasks)
    const blocked_tasks = github_issues
      .filter((issue) =>
        issue.labels.some((label) => label.label_name === 'status/blocked')
      )
      .sort(sort_tasks)
    const deferred_tasks = github_issues
      .filter((issue) =>
        issue.labels.some((label) => label.label_name === 'status/deferred')
      )
      .sort(sort_tasks)
    const no_status_labels = ['status/inactive']
    const no_status_tasks = github_issues
      .filter((issue) =>
        issue.labels.some((label) =>
          no_status_labels.includes(label.label_name)
        )
      )
      .sort(sort_tasks)

    return {
      discussions: discussions_state.get('discussions'),
      discussions_is_pending: discussions_state.get('isPending'),
      issues_is_pending: issues_state.get('isPending'),
      in_progress_tasks,
      planned_tasks,
      blocked_tasks,
      deferred_tasks,
      no_status_tasks
    }
  }
)
const mapDispatchToProps = {
  load_github_discussions: githubDiscussionsActions.getGithubDiscussions,
  load_github_issues: githubIssuesActions.getGithubIssues
}

export default connect(mapStateToProps, mapDispatchToProps)(RoadmapPage)
