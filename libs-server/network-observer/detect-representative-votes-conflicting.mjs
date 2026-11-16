import { lookup_root } from './index-block-forks.mjs'

// A conflict shows within seconds of the votes, so each representative's
// votes per root are kept this long.
const VOTE_CONFLICT_RETENTION_MS = 10 * 60 * 1000

// representative -> root -> timestamp key -> { block_hash, seen_at_ms, ... }.
// Final votes all carry the maximum timestamp, so they share the key 'final'.
export const create_vote_conflict_state = () => ({
  votes_by_representative: new Map()
})

const get_timestamp_key = (vote) =>
  vote.is_final ? 'final' : String(vote.vote_timestamp_ms)

// Records one representative's vote for one hash whose root is known. A
// different hash on the same root under the same timestamp is a conflict:
// critical when both votes are final, warning otherwise.
export const record_vote_for_conflicts = ({
  state,
  vote,
  block_hash,
  root
}) => {
  const representative_account = vote.representative_account
  let roots = state.votes_by_representative.get(representative_account)
  if (!roots) {
    roots = new Map()
    state.votes_by_representative.set(representative_account, roots)
  }
  let votes_by_timestamp = roots.get(root)
  if (!votes_by_timestamp) {
    votes_by_timestamp = new Map()
    roots.set(root, votes_by_timestamp)
  }

  const timestamp_key = get_timestamp_key(vote)
  const prior = votes_by_timestamp.get(timestamp_key)
  if (!prior) {
    votes_by_timestamp.set(timestamp_key, {
      block_hash,
      seen_at_ms: vote.received_at_ms,
      peer_address: vote.peer_address,
      vote_hash: vote.vote_hash,
      conflicting_block_hashes: new Set([block_hash])
    })
    return []
  }
  if (prior.conflicting_block_hashes.has(block_hash)) return []
  prior.conflicting_block_hashes.add(block_hash)

  return [
    {
      network_event_type: 'representative_votes_conflicting',
      network_event_phase: 'occurred',
      severity: vote.is_final ? 'critical' : 'warning',
      representative_account,
      peer_address: vote.peer_address,
      node_id: vote.peer_node_id,
      evidence: {
        root,
        is_final: vote.is_final,
        vote_timestamp_ms: vote.vote_timestamp_ms,
        conflicting_block_hashes: [prior.block_hash, block_hash].sort(),
        first_vote: {
          block_hash: prior.block_hash,
          vote_hash: prior.vote_hash,
          peer_address: prior.peer_address,
          received_at_ms: prior.seen_at_ms
        },
        second_vote: {
          block_hash,
          vote_hash: vote.vote_hash,
          peer_address: vote.peer_address,
          received_at_ms: vote.received_at_ms
        }
      },
      observed_at: Math.floor(vote.received_at_ms / 1000)
    }
  ]
}

export const prune_vote_conflict_state = ({ state, now_ms }) => {
  const cutoff_ms = now_ms - VOTE_CONFLICT_RETENTION_MS
  for (const [representative_account, roots] of state.votes_by_representative) {
    for (const [root, votes_by_timestamp] of roots) {
      for (const [timestamp_key, recorded] of votes_by_timestamp) {
        if (recorded.seen_at_ms < cutoff_ms) {
          votes_by_timestamp.delete(timestamp_key)
        }
      }
      if (!votes_by_timestamp.size) roots.delete(root)
    }
    if (!roots.size)
      state.votes_by_representative.delete(representative_account)
  }
}

// Checks one vote's hashes against the roots the fork index learned from
// published blocks. A hash whose block the observer never saw is skipped: votes
// carry no roots, and the observer resolves none from elsewhere.
export const check_vote_for_conflicts = ({ state, fork_index, vote }) => {
  const network_events = []
  for (const block_hash of vote.block_hashes) {
    const known = lookup_root({ fork_index, block_hash })
    if (!known) continue
    network_events.push(
      ...record_vote_for_conflicts({
        state,
        vote,
        block_hash,
        root: known.root
      })
    )
  }
  return network_events
}
