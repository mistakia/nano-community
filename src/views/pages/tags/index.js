import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { docActions, getDocById } from '@core/docs'

import TagsPage from './tags'

const mapStateToProps = createSelector(getDocById, (doc) => ({ doc }))

const mapDispatchToProps = {
  getTagDoc: docActions.getTagDoc
}

export default connect(mapStateToProps, mapDispatchToProps)(TagsPage)
