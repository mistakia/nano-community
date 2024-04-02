import { Record, List } from 'immutable'

export const GithubIssue = new Record({
  id: null,
  state: null,
  actor_name: null,
  actor_avatar: null,
  assignee_name: null,
  assignee_avatar: null,
  title: null,
  url: null,
  repo: null,
  body: null,
  ref: null,
  created_at: null,
  updated_at: null,
  labels: new List()
})

export function createGithubIssue({
  id,
  state,
  actor_name,
  actor_avatar,
  assignee_name,
  assignee_avatar,
  title,
  url,
  repo,
  body,
  ref,
  created_at,
  updated_at,
  labels
}) {
  return new GithubIssue({
    id,
    state,
    actor_name,
    actor_avatar,
    assignee_name,
    assignee_avatar,
    title,
    url,
    repo,
    body,
    ref,
    created_at,
    updated_at,
    labels: new List(labels)
  })
}
