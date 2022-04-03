import { Record, List } from 'immutable'

export const GithubDiscussion = new Record({
  id: null,
  actor_name: null,
  actor_avatar: null,
  title: null,
  url: null,
  repo: null,
  body: null,
  ref: null,
  upvotes: null,
  created_at: null,
  updated_at: null,
  labels: new List()
})

export function createGithubDiscussion({
  id,
  actor_name,
  actor_avatar,
  title,
  url,
  repo,
  body,
  ref,
  upvotes,
  created_at,
  updated_at,
  labels
}) {
  return new GithubDiscussion({
    id,
    actor_name,
    actor_avatar,
    title,
    url,
    repo,
    body,
    ref,
    upvotes,
    created_at,
    updated_at,
    labels: new List(labels)
  })
}
