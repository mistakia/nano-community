import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  postlistActions,
  getPostsForPostlistId,
  getPostlistForId
} from '@core/postlists'

import Posts from './posts'

const mapStateToProps = createSelector(
  getPostsForPostlistId,
  getPostlistForId,
  (posts, postlist) => ({
    posts,
    isPending: postlist.isPending
  })
)

const mapDispatchToProps = {
  getPosts: postlistActions.getPosts
}

export default connect(mapStateToProps, mapDispatchToProps)(Posts)
