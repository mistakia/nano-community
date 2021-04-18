import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { postlistActions, getPostsForPostlistId } from '@core/postlists'

import Post from './posts'

const mapStateToProps = createSelector(getPostsForPostlistId, (posts) => ({
  posts
}))

const mapDispatchToProps = {
  getPosts: postlistActions.getPosts
}

export default connect(mapStateToProps, mapDispatchToProps)(Post)
