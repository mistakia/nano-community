import { Record, List } from 'immutable'

export const GithubIssue = new Record({
  id: null,
  actor_name: null,
  actor_avatar: null,
  title: null,
  url: null,
  repo: null,
  body: null,
  ref: null,
  created_at: null,
  labels: new List()
})

export function createGithubIssue({
  id,
  actor_name,
  actor_avatar,
  title,
  url,
  repo,
  body,
  ref,
  created_at,
  labels
}) {
  return new GithubIssue({
    id,
    actor_name,
    actor_avatar,
    title,
    url,
    repo,
    body,
    ref,
    created_at,
    labels: new List(labels)
  })
}
