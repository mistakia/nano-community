import { getPosts } from '@core/posts'

import { Postlist } from './postlist'

export function getPostlists(state) {
  return state.get('postlists')
}

export function getPostlistForId(state, { id }) {
  const postlists = getPostlists(state)
  return postlists.get(id, new Postlist())
}

export function getPostsForPostlistId(state, { id }) {
  const postlists = getPostlists(state)
  const postlist = getPostlistForId(state, { id })
  const posts = getPosts(state)

  if (id === 'trending') {
    const top = postlists.get('top', new Postlist())
    const announcements = postlists.get('announcements', new Postlist())
    const ids = top.postIds.merge(announcements.postIds)
    const filtered = postlist.postIds.filter((id) => !ids.includes(id))
    return filtered.map((id) => posts.get(id))
  }

  return postlist.postIds.map((id) => posts.get(id))
}
