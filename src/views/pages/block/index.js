import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { blocksActions, getBlockByHash } from '@core/blocks'
import { notificationActions } from '@core/notifications'

import BlockPage from './block'

const mapStateToProps = createSelector(getBlockByHash, (block) => ({
  block
}))

const mapDispatchToProps = {
  getBlock: blocksActions.getBlock,
  showNotification: notificationActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockPage)
