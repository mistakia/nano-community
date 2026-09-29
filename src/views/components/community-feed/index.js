import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  postlistActions,
  getPostsForPostlistId,
  getPostlistForId
} from '@core/postlists'

import CommunityFeed, { feed_tabs } from './community-feed'

// a post that is nothing but a link says little on its own, so list it last
const is_bare_link = (post) =>
  /^https?:\/\/\S+$/.test((post.title || post.text || '').trim())

const tab_selectors = feed_tabs.map(({ id }) =>
  createSelector(
    (state) => getPostsForPostlistId(state, { id }),
    (state) => getPostlistForId(state, { id }).isPending,
    (posts, is_pending) => ({
      posts: posts.sortBy((post) => (is_bare_link(post) ? 1 : 0)),
      is_pending
    })
  )
)

const mapStateToProps = createSelector(tab_selectors, (...tabs) => ({
  lists: Object.fromEntries(feed_tabs.map(({ id }, i) => [id, tabs[i]]))
}))

const mapDispatchToProps = {
  getPosts: postlistActions.getPosts
}

export default connect(mapStateToProps, mapDispatchToProps)(CommunityFeed)
