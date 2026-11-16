/* global describe before afterEach it */
import chai from 'chai'

import knex from '#db'
import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'
import {
  CONFIRMED_PAIR_MINIMUM_AGE_MS,
  FINAL_VOTE_INDEX_MAXIMUM_COUNT,
  create_fork_index,
  record_published_block,
  record_final_vote,
  get_confirmed_pair,
  lookup_root,
  prune_fork_index
} from '#libs-server/network-observer/index-block-forks.mjs'
import {
  create_vote_conflict_state,
  check_vote_for_conflicts
} from '#libs-server/network-observer/detect-representative-votes-conflicting.mjs'
import {
  MINORITY_FINAL_VOTE_SETTLE_MS,
  create_minority_final_vote_state,
  record_principal_final_vote,
  settle_minority_final_votes,
  get_minority_final_vote_counts
} from '#libs-server/network-observer/count-minority-final-votes.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const START_MS = 1_800_000_000_000
const ROOT = 'a'.repeat(64)
const HASH_ONE = '1'.repeat(64)
const HASH_TWO = '2'.repeat(64)
const HASH_THREE = '3'.repeat(64)
const REPRESENTATIVE_ACCOUNT = `nano_1${'1'.repeat(59)}`
const OPEN_ACCOUNT =
  'nano_1111111111111111111111111111111111111111111111111111hifc8npp'

const build_block = (block_hash, offset_ms = 0) => ({
  block_hash,
  root: ROOT,
  account: OPEN_ACCOUNT,
  previous: ROOT,
  representative: REPRESENTATIVE_ACCOUNT,
  is_epoch: false,
  peer_address: '::ffff:10.0.0.1',
  peer_port: 7075,
  peer_node_id: 'node_1one',
  received_at_ms: START_MS + offset_ms
})

const build_vote = ({ block_hashes, is_final, offset_ms = 0 }) => ({
  representative_account: REPRESENTATIVE_ACCOUNT,
  block_hashes,
  is_final,
  vote_timestamp_ms: is_final ? null : START_MS,
  vote_hash: `${block_hashes[0].slice(0, 8)}${is_final}`,
  peer_address: '::ffff:10.0.0.1',
  peer_node_id: 'node_1one',
  received_at_ms: START_MS + offset_ms
})

describe('network observer fork index', () => {
  before(async () => {
    await mochaGlobalSetup()
    await knex('network_events').del()
  })

  afterEach(async () => {
    await knex('network_events').del()
  })

  it('gives one block_fork_detected for two blocks on one root', () => {
    const fork_index = create_fork_index()
    expect(
      record_published_block({ fork_index, block: build_block(HASH_ONE) })
    ).to.deep.equal([])
    // the same block again is not a fork
    expect(
      record_published_block({ fork_index, block: build_block(HASH_ONE, 5) })
    ).to.deep.equal([])
    const network_events = record_published_block({
      fork_index,
      block: build_block(HASH_TWO, 10)
    })
    expect(network_events).to.have.length(1)
    expect(network_events[0].evidence).to.deep.include({
      root: ROOT,
      block_hash: HASH_TWO,
      prior_block_hashes: [HASH_ONE]
    })
  })

  it('gives a second event for a third block and leaves the first row unchanged', async () => {
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    const [first] = record_published_block({
      fork_index,
      block: build_block(HASH_TWO, 10)
    })
    await insert_network_events({ network_events: [first] })
    const [first_row] = await knex('network_events')

    const [second] = record_published_block({
      fork_index,
      block: build_block(HASH_THREE, 20)
    })
    expect(second.evidence.prior_block_hashes).to.deep.equal([
      HASH_ONE,
      HASH_TWO
    ])
    await insert_network_events({ network_events: [first, second] })

    const rows = await knex('network_events').orderBy('network_event_sequence')
    expect(rows).to.have.length(2)
    expect(rows[0]).to.deep.equal(first_row)
  })

  it('offers the newest pair confirmed at least a minute ago and prunes past retention', () => {
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    record_published_block({ fork_index, block: build_block(HASH_TWO, 1) })
    record_final_vote({
      fork_index,
      block_hash: HASH_ONE,
      received_at_ms: START_MS
    })
    record_final_vote({
      fork_index,
      block_hash: HASH_TWO,
      received_at_ms: START_MS + 30 * 1000
    })
    expect(
      get_confirmed_pair({
        fork_index,
        now_ms: START_MS + CONFIRMED_PAIR_MINIMUM_AGE_MS
      })
    ).to.deep.equal({ block_hash: HASH_ONE, root: ROOT })
    expect(
      get_confirmed_pair({
        fork_index,
        now_ms: START_MS + 30 * 1000 + CONFIRMED_PAIR_MINIMUM_AGE_MS
      })
    ).to.deep.equal({ block_hash: HASH_TWO, root: ROOT })

    prune_fork_index({ fork_index, now_ms: START_MS + 2 * 60 * 60 * 1000 })
    expect(lookup_root({ fork_index, block_hash: HASH_ONE })).to.equal(null)
    expect(fork_index.hashes_by_root.size).to.equal(0)
    expect(fork_index.final_voted_at_ms.size).to.equal(0)
  })
})

describe('network observer fork index bounds', () => {
  it('keeps only the newest final-voted hashes', () => {
    const fork_index = create_fork_index()
    for (let i = 0; i <= FINAL_VOTE_INDEX_MAXIMUM_COUNT; i++) {
      record_final_vote({
        fork_index,
        block_hash: i.toString(16).padStart(64, '0'),
        received_at_ms: START_MS + i
      })
    }
    expect(fork_index.final_voted_at_ms.size).to.equal(
      FINAL_VOTE_INDEX_MAXIMUM_COUNT
    )
    expect(fork_index.final_voted_at_ms.has('0'.repeat(64))).to.equal(false)
  })
})

describe('network observer conflicting votes', () => {
  it('gives a critical conflict for two final votes for different hashes on one root', () => {
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    record_published_block({ fork_index, block: build_block(HASH_TWO, 1) })
    const state = create_vote_conflict_state()

    expect(
      check_vote_for_conflicts({
        state,
        fork_index,
        vote: build_vote({ block_hashes: [HASH_ONE], is_final: true })
      })
    ).to.deep.equal([])
    const network_events = check_vote_for_conflicts({
      state,
      fork_index,
      vote: build_vote({
        block_hashes: [HASH_TWO],
        is_final: true,
        offset_ms: 50
      })
    })
    expect(network_events).to.have.length(1)
    expect(network_events[0].severity).to.equal('critical')
    expect(network_events[0].evidence).to.deep.include({
      root: ROOT,
      conflicting_block_hashes: [HASH_ONE, HASH_TWO]
    })
  })

  it('gives a warning for non-final votes and nothing for different timestamps', () => {
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    record_published_block({ fork_index, block: build_block(HASH_TWO, 1) })
    const state = create_vote_conflict_state()
    check_vote_for_conflicts({
      state,
      fork_index,
      vote: build_vote({ block_hashes: [HASH_ONE], is_final: false })
    })
    const [conflict] = check_vote_for_conflicts({
      state,
      fork_index,
      vote: build_vote({ block_hashes: [HASH_TWO], is_final: false })
    })
    expect(conflict.severity).to.equal('warning')

    // a later timestamp is a changed vote, not a conflict
    expect(
      check_vote_for_conflicts({
        state,
        fork_index,
        vote: {
          ...build_vote({ block_hashes: [HASH_THREE], is_final: false }),
          vote_timestamp_ms: START_MS + 1000
        }
      })
    ).to.deep.equal([])
  })

  it('skips a hash whose block was never published', () => {
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    const state = create_vote_conflict_state()
    check_vote_for_conflicts({
      state,
      fork_index,
      vote: build_vote({ block_hashes: [HASH_ONE], is_final: true })
    })
    expect(
      check_vote_for_conflicts({
        state,
        fork_index,
        vote: build_vote({ block_hashes: [HASH_TWO], is_final: true })
      })
    ).to.deep.equal([])
  })
})

describe('network observer minority final votes', () => {
  const representative = (index) => `representative_${index}`
  const vote_from = (index, block_hash, offset_ms = 0) => ({
    state,
    vote: build_vote({ block_hashes: [block_hash], is_final: true, offset_ms }),
    representative_account: representative(index)
  })
  let state

  it('counts a hash final-voted by under a quarter of the principals once it settles', () => {
    state = create_minority_final_vote_state()
    const fork_index = create_fork_index()
    record_published_block({ fork_index, block: build_block(HASH_ONE) })
    for (let index = 0; index < 20; index++) {
      record_principal_final_vote(vote_from(index, HASH_ONE))
    }
    // the same representative twice counts once
    record_principal_final_vote(vote_from(0, HASH_TWO))
    record_principal_final_vote(vote_from(0, HASH_TWO, 5))
    record_principal_final_vote(vote_from(1, HASH_TWO))
    record_principal_final_vote(vote_from(2, HASH_THREE, 30 * 1000))

    const settle = (now_ms, is_degraded = false) =>
      settle_minority_final_votes({
        state,
        fork_index,
        principal_count: 20,
        is_degraded,
        now_ms
      })
    settle(START_MS + MINORITY_FINAL_VOTE_SETTLE_MS - 1)
    expect(get_minority_final_vote_counts({ state })).to.deep.include({
      settled_hash_count: 0,
      tracked_hash_count: 3
    })

    settle(START_MS + MINORITY_FINAL_VOTE_SETTLE_MS)
    expect(get_minority_final_vote_counts({ state })).to.deep.equal({
      settled_hash_count: 2,
      minority_hash_count: 1,
      minority_unknown_root_count: 1,
      dropped_hash_count: 0,
      voter_share_deciles: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      tracked_hash_count: 1
    })

    // a degraded observer forgets settled hashes uncounted
    settle(START_MS + 30 * 1000 + MINORITY_FINAL_VOTE_SETTLE_MS, true)
    expect(get_minority_final_vote_counts({ state })).to.deep.include({
      settled_hash_count: 2,
      minority_hash_count: 1,
      tracked_hash_count: 0
    })
  })
})
