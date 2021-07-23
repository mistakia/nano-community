import { Block } from './block'

export function getBlocks(state) {
  return state.get('blocks')
}

export function getBlockByHash(state, props) {
  const { hash } = props.match.params
  const blocks = getBlocks(state)
  return blocks.get(hash, new Block())
}
