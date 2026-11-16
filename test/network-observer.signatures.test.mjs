/* global describe it */
import chai from 'chai'

import { PEER_SIGNATURE_INVALID_WINDOW_MINUTES } from '#common/network-event-types.mjs'
import {
  create_signature_state,
  record_invalid_signature,
  flush_signature_windows
} from '#libs-server/network-observer/detect-peer-signature-invalid.mjs'
import { build_network_event_row } from '#libs-server/network-events/insert-network-events.mjs'

const expect = chai.expect

const WINDOW_MS = PEER_SIGNATURE_INVALID_WINDOW_MINUTES * 60 * 1000
// aligned to a window start
const WINDOW_START_MS = Math.floor(1_800_000_000_000 / WINDOW_MS) * WINDOW_MS
const PEER_ADDRESS = '::ffff:10.0.0.1'

const invalid_vote = (received_at_ms) => ({
  peer_address: PEER_ADDRESS,
  peer_port: 7075,
  peer_node_id: 'node_1one',
  message_type: 'confirm_ack',
  signer_public_key: 'f'.repeat(64),
  received_at_ms
})

describe('network observer invalid peer signatures', () => {
  it('gives one event with a count of 1000 for 1000 invalid votes in one window, and a new event next window', () => {
    const state = create_signature_state()
    const network_events = []
    for (let i = 0; i < 1000; i++) {
      network_events.push(
        ...record_invalid_signature({
          state,
          invalid_signature: invalid_vote(WINDOW_START_MS + i * 1000)
        })
      )
    }
    expect(network_events).to.deep.equal([])
    expect(
      flush_signature_windows({ state, now_ms: WINDOW_START_MS + 1000 * 1000 })
    ).to.deep.equal([])

    const next_window = record_invalid_signature({
      state,
      invalid_signature: invalid_vote(WINDOW_START_MS + WINDOW_MS + 5)
    })
    expect(next_window).to.have.length(1)
    expect(next_window[0].evidence).to.deep.include({
      window_began_at: WINDOW_START_MS / 1000,
      invalid_signature_count: 1000,
      message_types: { confirm_ack: 1000 }
    })

    const [second] = flush_signature_windows({
      state,
      now_ms: WINDOW_START_MS + 2 * WINDOW_MS
    })
    expect(second.evidence.invalid_signature_count).to.equal(1)
    expect(build_network_event_row(second).network_event_id).to.not.equal(
      build_network_event_row(next_window[0]).network_event_id
    )
  })

  it('keeps an open window in saved state across a restart', () => {
    const state = create_signature_state()
    record_invalid_signature({
      state,
      invalid_signature: invalid_vote(WINDOW_START_MS)
    })
    const restored = JSON.parse(JSON.stringify(state))
    record_invalid_signature({
      state: restored,
      invalid_signature: invalid_vote(WINDOW_START_MS + 1000)
    })
    const [event] = flush_signature_windows({
      state: restored,
      now_ms: WINDOW_START_MS + WINDOW_MS
    })
    expect(event.evidence.invalid_signature_count).to.equal(2)
  })
})
