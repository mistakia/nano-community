import { BLOCK_FORK_INDEX_RETENTION_MINUTES } from '#common/network-event-types.mjs'

const RETENTION_MS = BLOCK_FORK_INDEX_RETENTION_MINUTES * 60 * 1000

// The crawler asks only about blocks the network confirmed at least this long
// ago: a peer answers confirm_req with final votes for confirmed blocks only.
export const CONFIRMED_PAIR_MINIMUM_AGE_MS = 60 * 1000

// The crawler needs only recent confirmed pairs, and mainnet final-votes over
// a hundred hashes a second, so only this many of the newest are kept.
export const FINAL_VOTE_INDEX_MAXIMUM_COUNT = 20000

// Hash-to-root and root-to-hashes maps over published blocks, plus the first
// final vote seen per hash. Everything is kept
// for BLOCK_FORK_INDEX_RETENTION_MINUTES. The index is rebuilt after a
// restart rather than saved: a fork older than the retention is not a new one.
export const create_fork_index = () => ({
  root_by_hash: new Map(), // hash -> { root, seen_at_ms }
  hashes_by_root: new Map(), // root -> [hash] of published blocks
  final_voted_at_ms: new Map() // hash -> first final vote seen
})

// Records a published block. A further valid block on a known root is a fork,
// and each one is its own occurrence: stored events are immutable.
export const record_published_block = ({ fork_index, block }) => {
  const { block_hash, root, received_at_ms } = block
  if (fork_index.root_by_hash.has(block_hash)) return []
  fork_index.root_by_hash.set(block_hash, { root, seen_at_ms: received_at_ms })

  const root_hashes = fork_index.hashes_by_root.get(root) ?? []
  const prior_block_hashes = [...root_hashes]
  root_hashes.push(block_hash)
  fork_index.hashes_by_root.set(root, root_hashes)
  if (!prior_block_hashes.length) return []

  return [
    {
      network_event_type: 'block_fork_detected',
      network_event_phase: 'occurred',
      peer_address: block.peer_address,
      node_id: block.peer_node_id,
      evidence: {
        root,
        block_hash,
        prior_block_hashes,
        account: block.account,
        previous: block.previous,
        representative: block.representative,
        is_epoch: block.is_epoch,
        peer_port: block.peer_port,
        received_at_ms
      },
      observed_at: Math.floor(received_at_ms / 1000)
    }
  ]
}

export const lookup_root = ({ fork_index, block_hash }) =>
  fork_index.root_by_hash.get(block_hash) ?? null

// Map order is insertion order, so the first key is the oldest.
export const record_final_vote = ({
  fork_index,
  block_hash,
  received_at_ms
}) => {
  const { final_voted_at_ms } = fork_index
  if (final_voted_at_ms.has(block_hash)) return
  final_voted_at_ms.set(block_hash, received_at_ms)
  if (final_voted_at_ms.size > FINAL_VOTE_INDEX_MAXIMUM_COUNT) {
    final_voted_at_ms.delete(final_voted_at_ms.keys().next().value)
  }
}

// The newest hash and root pair whose first final vote is at least
// CONFIRMED_PAIR_MINIMUM_AGE_MS old, or null.
export const get_confirmed_pair = ({ fork_index, now_ms }) => {
  let newest = null
  for (const [block_hash, final_voted_at_ms] of fork_index.final_voted_at_ms) {
    if (now_ms - final_voted_at_ms < CONFIRMED_PAIR_MINIMUM_AGE_MS) continue
    if (newest && final_voted_at_ms <= newest.final_voted_at_ms) continue
    const known = fork_index.root_by_hash.get(block_hash)
    if (!known) continue
    newest = { block_hash, root: known.root, final_voted_at_ms }
  }
  return newest && { block_hash: newest.block_hash, root: newest.root }
}

export const prune_fork_index = ({ fork_index, now_ms }) => {
  const cutoff_ms = now_ms - RETENTION_MS
  for (const [block_hash, known] of fork_index.root_by_hash) {
    if (known.seen_at_ms >= cutoff_ms) continue
    fork_index.root_by_hash.delete(block_hash)
    const remaining = (fork_index.hashes_by_root.get(known.root) ?? []).filter(
      (hash) => hash !== block_hash
    )
    if (remaining.length) fork_index.hashes_by_root.set(known.root, remaining)
    else fork_index.hashes_by_root.delete(known.root)
  }
  for (const [block_hash, final_voted_at_ms] of fork_index.final_voted_at_ms) {
    if (final_voted_at_ms < cutoff_ms) {
      fork_index.final_voted_at_ms.delete(block_hash)
    }
  }
}

export const get_fork_index_size = ({ fork_index }) => ({
  indexed_block_count: fork_index.root_by_hash.size,
  indexed_root_count: fork_index.hashes_by_root.size,
  final_voted_block_count: fork_index.final_voted_at_ms.size
})
