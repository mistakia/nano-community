/* global describe before after beforeEach it */
import chai from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  DEGRADED_SIGNAL_MINUTES,
  ensure_data_directory,
  save_observer_state,
  load_observer_state,
  evaluate_degraded,
  build_coverage_window,
  create_signal_tracker,
  update_degraded_signal,
  update_spool_backlog_signal
} from '#libs-server/network-observer/network-observer-state.mjs'
import { create_liveness_state } from '#libs-server/network-observer/detect-representative-liveness.mjs'
import { create_crawler_state } from '#libs-server/network-observer/crawl-representative-peers.mjs'

const expect = chai.expect

const MINUTE_MS = 60 * 1000
const START_MS = 1_800_000_000_000

// Records each emit-signal call as one line of JSON argv.
const STUB_SOURCE = `#!/bin/sh
node -e 'console.log(JSON.stringify(process.argv.slice(1)))' -- "$@" >> "$EMIT_SIGNAL_TEST_OUTPUT"
`

describe('network observer state', () => {
  let directory
  let output_file
  const saved_environment = {}

  before(() => {
    directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'network-observer-state-')
    )
    const stub_file = path.join(directory, 'emit-signal')
    fs.writeFileSync(stub_file, STUB_SOURCE, { mode: 0o755 })
    output_file = path.join(directory, 'calls')
    for (const key of ['EMIT_SIGNAL_PATH', 'EMIT_SIGNAL_TEST_OUTPUT']) {
      saved_environment[key] = process.env[key]
    }
    process.env.EMIT_SIGNAL_PATH = stub_file
    process.env.EMIT_SIGNAL_TEST_OUTPUT = output_file
  })

  after(() => {
    for (const [key, value] of Object.entries(saved_environment)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    fs.rmSync(directory, { recursive: true, force: true })
  })

  beforeEach(() => fs.rmSync(output_file, { force: true }))

  const read_calls = () =>
    fs.existsSync(output_file)
      ? fs
          .readFileSync(output_file, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line))
      : []

  it('round-trips the saved state', () => {
    const { state_file } = ensure_data_directory({
      data_directory: path.join(directory, 'data')
    })
    expect(load_observer_state({ state_file })).to.equal(null)

    const liveness = create_liveness_state({ observing_since_ms: START_MS })
    liveness.last_vote_at_ms[`nano_1${'1'.repeat(59)}`] = START_MS
    const observer_state = {
      liveness,
      crawler: create_crawler_state(),
      signatures: { windows_by_peer: {} },
      raised_signal_keys: { 'network-observer-degraded': true }
    }
    save_observer_state({ state_file, observer_state, now_ms: START_MS })
    expect(load_observer_state({ state_file })).to.deep.equal({
      saved_at_ms: START_MS,
      ...observer_state
    })
    expect(fs.readdirSync(path.dirname(state_file))).to.not.include(
      `${path.basename(state_file)}.${process.pid}.tmp`
    )
  })

  it('reads degraded from peer count and principal voting share', () => {
    expect(
      evaluate_degraded({ peer_count: 50, principal_voting_share: 0.9 })
    ).to.deep.equal({ is_degraded: false, degraded_reasons: [] })
    expect(
      evaluate_degraded({ peer_count: 5, principal_voting_share: 0.4 })
        .degraded_reasons
    ).to.deep.equal(['peer_count_low', 'principal_voting_share_low'])
    expect(
      evaluate_degraded({ peer_count: 50, principal_voting_share: null })
        .degraded_reasons
    ).to.deep.equal(['principal_set_unknown'])
  })

  it('emits the degraded signal once it holds and closes it on recovery', async () => {
    const signal_tracker = create_signal_tracker({
      raised_keys: { 'network-observer-degraded': false }
    })
    const degraded_state = { degraded_since_ms: null }
    const degraded = evaluate_degraded({
      peer_count: 3,
      principal_voting_share: 0.9
    })

    for (let minute = 0; minute <= DEGRADED_SIGNAL_MINUTES + 2; minute++) {
      await update_degraded_signal({
        signal_tracker,
        degraded_state,
        degraded,
        now_ms: START_MS + minute * MINUTE_MS
      })
    }
    let calls = read_calls()
    expect(calls).to.have.length(1)
    expect(calls[0].slice(0, 5)).to.deep.equal([
      'emit',
      '--source',
      'service:nano-community-network-observer',
      '--kind',
      'service_health'
    ])
    expect(calls[0]).to.include('network-observer-degraded')

    for (const minute of [20, 21]) {
      await update_degraded_signal({
        signal_tracker,
        degraded_state,
        degraded: { is_degraded: false, degraded_reasons: [] },
        now_ms: START_MS + minute * MINUTE_MS
      })
    }
    calls = read_calls()
    expect(calls).to.have.length(2)
    expect(calls[1].slice(0, 5)).to.deep.equal([
      'close',
      '--source',
      'service:nano-community-network-observer',
      '--dedup-key',
      'network-observer-degraded'
    ])
    expect(signal_tracker.get_raised_keys()).to.deep.equal({
      'network-observer-degraded': false
    })
  })

  it('never signals a degraded spell shorter than the hold', async () => {
    const signal_tracker = create_signal_tracker({
      raised_keys: { 'network-observer-degraded': false }
    })
    const degraded_state = { degraded_since_ms: null }
    for (let minute = 0; minute < DEGRADED_SIGNAL_MINUTES - 1; minute++) {
      await update_degraded_signal({
        signal_tracker,
        degraded_state,
        degraded: { is_degraded: true, degraded_reasons: ['peer_count_low'] },
        now_ms: START_MS + minute * MINUTE_MS
      })
    }
    expect(read_calls()).to.deep.equal([])
  })

  it('closes a signal of unknown state on the first healthy reading', async () => {
    const signal_tracker = create_signal_tracker()
    const spool_status = {
      spool_segment_count: 0,
      spool_entry_count: 0,
      spool_oldest_entry_age_seconds: 0
    }
    await update_spool_backlog_signal({ signal_tracker, spool_status })
    await update_spool_backlog_signal({ signal_tracker, spool_status })
    const calls = read_calls()
    expect(calls).to.have.length(1)
    expect(calls[0][0]).to.equal('close')
    expect(calls[0]).to.include('network-observer-spool-backlog')

    await update_spool_backlog_signal({
      signal_tracker,
      spool_status: { ...spool_status, spool_oldest_entry_age_seconds: 901 },
      last_drain_error: 'connection refused'
    })
    expect(read_calls()[1][0]).to.equal('emit')
  })

  it('builds coverage windows in epoch seconds', () => {
    expect(
      build_coverage_window({
        began_at_ms: START_MS,
        ended_at_ms: START_MS + MINUTE_MS
      })
    ).to.deep.equal({
      producer: 'network_observer',
      coverage_began_at: START_MS / 1000,
      coverage_ended_at: START_MS / 1000 + 60
    })
  })
})
