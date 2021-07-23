import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { blocksActions, getBlockByHash } from '@core/blocks'

import BlockPage from './block'

const mapStateToProps = createSelector(getBlockByHash, (block) => ({
  block
}))

const mapDispatchToProps = {
  getBlock: blocksActions.getBlock
}

export default connect(mapStateToProps, mapDispatchToProps)(BlockPage)
