import { getPosts } from '@core/posts'

import { Postlist } from './postlist'

export function getPostlists(state) {
  return state.get('postlists')
}

export function getPostsForPostlistId(state, { id }) {
  const postlists = getPostlists(state)
  const postlist = postlists.get(id, new Postlist())
  const posts = getPosts(state)

  return postlist.postIds.map((id) => posts.get(id))
}
