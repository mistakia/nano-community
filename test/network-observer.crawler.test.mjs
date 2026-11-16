/* global describe it */
import chai from 'chai'

import {
  CRAWLER_ROUND_MINUTES,
  CRAWLER_SETTLE_MINUTES,
  create_crawler_state,
  record_direct_vote,
  evaluate_peer_hosting,
  crawl_representative_peers
} from '#libs-server/network-observer/crawl-representative-peers.mjs'
import { build_network_event_row } from '#libs-server/network-events/insert-network-events.mjs'

const expect = chai.expect

const REPRESENTATIVE_A = `nano_1${'1'.repeat(59)}`
const REPRESENTATIVE_B = `nano_3${'3'.repeat(59)}`
const PEER_ONE = 'node_1one'
const PEER_TWO = 'node_1two'
const ROUND_MS = CRAWLER_ROUND_MINUTES * 60 * 1000
const SETTLE_MS = CRAWLER_SETTLE_MINUTES * 60 * 1000
const START_MS = 1_800_000_000_000

const direct_vote = ({
  representative_account,
  peer_node_id,
  received_at_ms
}) => ({
  representative_account,
  peer_node_id,
  peer_address: `::ffff:10.0.0.${peer_node_id === PEER_ONE ? 1 : 2}`,
  is_rebroadcast: false,
  received_at_ms
})

// Runs rounds every ROUND_MS from START_MS through until_ms. replies_at(now)
// lists the [representative, peer] pairs that answer in that round.
const run_rounds = ({ state, until_ms, replies_at }) => {
  const network_events = []
  for (let now_ms = START_MS; now_ms <= until_ms; now_ms += ROUND_MS) {
    for (const [representative_account, peer_node_id] of replies_at(now_ms)) {
      record_direct_vote({
        state,
        vote: direct_vote({
          representative_account,
          peer_node_id,
          received_at_ms: now_ms
        })
      })
    }
    network_events.push(...evaluate_peer_hosting({ state, now_ms }))
  }
  return network_events
}

describe('network observer crawler', () => {
  it('emits one began for a peer whose replies carry two representatives over the settle window', () => {
    const state = create_crawler_state()
    const network_events = run_rounds({
      state,
      until_ms: START_MS + 2 * SETTLE_MS,
      replies_at: () => [
        [REPRESENTATIVE_A, PEER_ONE],
        [REPRESENTATIVE_B, PEER_ONE]
      ]
    })
    expect(network_events).to.have.length(1)
    expect(network_events[0]).to.deep.include({
      network_event_type: 'node_hosts_multiple_representatives',
      network_event_phase: 'began',
      node_id: PEER_ONE,
      observed_at: START_MS / 1000
    })
    expect(network_events[0].evidence.representative_accounts).to.deep.equal([
      REPRESENTATIVE_A,
      REPRESENTATIVE_B
    ])
  })

  it('emits nothing for a single representative that moves between peers', () => {
    const state = create_crawler_state()
    const network_events = run_rounds({
      state,
      until_ms: START_MS + 3 * SETTLE_MS,
      // alternates peers every round
      replies_at: (now_ms) => [
        [
          REPRESENTATIVE_A,
          ((now_ms - START_MS) / ROUND_MS) % 2 ? PEER_TWO : PEER_ONE
        ]
      ]
    })
    expect(network_events).to.deep.equal([])
  })

  it('ends the condition after the peer hosts one representative for the settle window', () => {
    const state = create_crawler_state()
    const moved_ms = START_MS + 2 * SETTLE_MS
    const network_events = run_rounds({
      state,
      until_ms: START_MS + 4 * SETTLE_MS,
      replies_at: (now_ms) =>
        now_ms < moved_ms
          ? [
              [REPRESENTATIVE_A, PEER_ONE],
              [REPRESENTATIVE_B, PEER_ONE]
            ]
          : [
              [REPRESENTATIVE_A, PEER_ONE],
              [REPRESENTATIVE_B, PEER_TWO]
            ]
    })
    expect(
      network_events.map((event) => event.network_event_phase)
    ).to.deep.equal(['began', 'ended'])
    const [began, ended] = network_events
    expect(ended.observed_at).to.equal(moved_ms / 1000)
    expect(build_network_event_row(ended).network_event_condition_id).to.equal(
      build_network_event_row(began).network_event_id
    )
  })

  it('ignores rebroadcast votes and judges nothing while degraded', () => {
    const state = create_crawler_state()
    record_direct_vote({
      state,
      vote: {
        ...direct_vote({
          representative_account: REPRESENTATIVE_A,
          peer_node_id: PEER_ONE,
          received_at_ms: START_MS
        }),
        is_rebroadcast: true
      }
    })
    expect(state.attributions).to.deep.equal({})
    expect(
      evaluate_peer_hosting({ state, now_ms: START_MS, is_degraded: true })
    ).to.deep.equal([])
    expect(state.peer_tracking).to.deep.equal({})
  })

  it('asks every peer once and returns each reply with its request time', async () => {
    const requests = []
    const node = {
      get_peers: () => [
        { peer_node_id: PEER_ONE, peer_address: '::ffff:10.0.0.1' },
        { peer_node_id: PEER_TWO, peer_address: '::ffff:10.0.0.2' }
      ],
      request_votes_from_peer: async (request) => {
        requests.push(request)
        return {
          requested_at_ms: START_MS,
          votes:
            request.peer_node_id === PEER_ONE
              ? [
                  direct_vote({
                    representative_account: REPRESENTATIVE_A,
                    peer_node_id: PEER_ONE,
                    received_at_ms: START_MS + 190
                  })
                ]
              : []
        }
      }
    }
    const hash_root_pair = { block_hash: 'a'.repeat(64), root: 'b'.repeat(64) }
    const crawl = await crawl_representative_peers({ node, hash_root_pair })
    expect(requests.map((request) => request.hash_root_pairs)).to.deep.equal([
      [hash_root_pair],
      [hash_root_pair]
    ])
    expect(crawl.asked_peer_count).to.equal(2)
    expect(crawl.replied_peer_count).to.equal(1)
    expect(crawl.replies[0].requested_at_ms).to.equal(START_MS)
  })
})
