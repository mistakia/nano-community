import { rpc } from '#common'

// One registry for every suite, as the node knows every block: a rebuild in
// one suite replays notes another suite stored
const blocks = new Map()

// Replaces the node's block_info with the registered blocks. Each entry maps a
// block hash to {block_account, confirmed}; any other hash is not found.
export function stub_block_info() {
  const original = rpc.blockInfo
  rpc.blockInfo = async ({ hash }) => {
    const block = blocks.get(hash.toLowerCase())
    if (!block) return { error: 'Block not found' }
    return {
      block_account: block.block_account,
      confirmed: block.confirmed === false ? 'false' : 'true'
    }
  }
  return {
    set: (block_hash, block) => blocks.set(block_hash, block),
    restore: () => {
      rpc.blockInfo = original
    }
  }
}
