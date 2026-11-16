import { lookup_root } from './index-block-forks.mjs'

// A hash final-voted by only a few principal representatives is the trace an
// equivocating final vote leaves: the winner on a root draws final votes from
// nearly every principal. A minority hash is one whose distinct principal
// final voters, counted once MINORITY_FINAL_VOTE_SETTLE_MS has passed since its
// first final vote, are under MINORITY_FINAL_VOTE_SHARE_MAXIMUM of the
// principal set. Those whose root the fork index lacks are the conflicts the
// observer cannot judge without resolving roots from peers.
export const MINORITY_FINAL_VOTE_SETTLE_MS = 60 * 1000
export const MINORITY_FINAL_VOTE_SHARE_MAXIMUM = 0.25

// Mainnet final-votes over a hundred hashes a second, so a settle window holds
// about 15000; past this many a new hash is dropped and counted.
export const MINORITY_FINAL_VOTE_TRACKED_MAXIMUM = 50000

export const create_minority_final_vote_state = () => ({
  // hash -> { first_final_vote_at_ms, representative_accounts: Set }
  voters_by_hash: new Map(),
  counts: {
    settled_hash_count: 0,
    minority_hash_count: 0,
    minority_unknown_root_count: 0,
    dropped_hash_count: 0,
    // settled hashes by the decile of the principal set that final-voted them:
    // index 0 is under 10%, index 10 is all of it. Tells sparse vote coverage
    // apart from genuine minorities.
    voter_share_deciles: new Array(11).fill(0)
  }
})

// Takes one principal representative's final vote. The caller passes an
// interned account string so the voter sets hold references, not copies.
export const record_principal_final_vote = ({
  state,
  vote,
  representative_account
}) => {
  for (const block_hash of vote.block_hashes) {
    let tally = state.voters_by_hash.get(block_hash)
    if (!tally) {
      if (state.voters_by_hash.size >= MINORITY_FINAL_VOTE_TRACKED_MAXIMUM) {
        state.counts.dropped_hash_count += 1
        continue
      }
      tally = {
        first_final_vote_at_ms: vote.received_at_ms,
        representative_accounts: new Set()
      }
      state.voters_by_hash.set(block_hash, tally)
    }
    tally.representative_accounts.add(representative_account)
  }
}

// Classifies every hash past the settle delay and forgets it. Map order is
// insertion order, so the scan stops at the first unsettled hash. While the
// observer is degraded, settled hashes are forgotten uncounted: a thin vote
// stream would make every hash look like a minority.
export const settle_minority_final_votes = ({
  state,
  fork_index,
  principal_count,
  is_degraded,
  now_ms
}) => {
  const minority_voter_maximum =
    principal_count * MINORITY_FINAL_VOTE_SHARE_MAXIMUM
  for (const [block_hash, tally] of state.voters_by_hash) {
    if (now_ms - tally.first_final_vote_at_ms < MINORITY_FINAL_VOTE_SETTLE_MS)
      break
    state.voters_by_hash.delete(block_hash)
    if (is_degraded) continue
    state.counts.settled_hash_count += 1
    const voter_share = principal_count
      ? tally.representative_accounts.size / principal_count
      : 0
    state.counts.voter_share_deciles[
      Math.min(10, Math.floor(voter_share * 10))
    ] += 1
    if (tally.representative_accounts.size >= minority_voter_maximum) continue
    state.counts.minority_hash_count += 1
    if (!lookup_root({ fork_index, block_hash })) {
      state.counts.minority_unknown_root_count += 1
    }
  }
}

export const get_minority_final_vote_counts = ({ state }) => ({
  ...state.counts,
  voter_share_deciles: [...state.counts.voter_share_deciles],
  tracked_hash_count: state.voters_by_hash.size
})
