/* global describe before after it */
import chai from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'

import knex from '#db'

import {
  REPRESENTATIVE_NOT_VOTING_MS,
  create_liveness_state,
  update_principal_set,
  record_representative_vote,
  evaluate_representative_liveness,
  get_principal_voting_share,
  restore_liveness_state
} from '#libs-server/network-observer/detect-representative-liveness.mjs'
import { build_network_event_row } from '#libs-server/network-events/insert-network-events.mjs'
import {
  load_principal_inputs,
  load_principal_inputs_with_cache
} from '#libs-server/network-observer/load-principal-representatives.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const ACCOUNT = `nano_1${'1'.repeat(59)}`
const OTHER_ACCOUNT = `nano_3${'3'.repeat(59)}`
const ONLINE_WEIGHT = '1000000'
const MINUTE_MS = 60 * 1000
const START_MS = 1_800_000_000_000

const principal_weights = { [ACCOUNT]: '1000', [OTHER_ACCOUNT]: '5000' }

const build_state = () => {
  const state = create_liveness_state({ observing_since_ms: START_MS })
  update_principal_set({
    state,
    online_weight: ONLINE_WEIGHT,
    weights_by_account: principal_weights,
    now_ms: START_MS
  })
  return state
}

// Replays a sequence of [time_ms, account] votes and evaluates once a minute
// from the first to the last time, returning every event in order.
const replay = ({ state, votes, until_ms, is_degraded = false, from_ms }) => {
  const network_events = []
  let next_vote = 0
  for (
    let now_ms = from_ms ?? START_MS;
    now_ms <= until_ms;
    now_ms += MINUTE_MS
  ) {
    while (next_vote < votes.length && votes[next_vote][0] <= now_ms) {
      const [received_at_ms, representative_account] = votes[next_vote++]
      network_events.push(
        ...record_representative_vote({
          state,
          representative_account,
          received_at_ms
        })
      )
    }
    network_events.push(
      ...evaluate_representative_liveness({ state, now_ms, is_degraded })
    )
  }
  return network_events
}

// Both accounts vote every 30 s over [from_ms, to_ms), except where skipped.
const steady_votes = ({ from_ms, to_ms, skip = () => false }) => {
  const votes = []
  for (let time_ms = from_ms; time_ms < to_ms; time_ms += 30 * 1000) {
    for (const account of [ACCOUNT, OTHER_ACCOUNT]) {
      if (!skip({ account, time_ms })) votes.push([time_ms, account])
    }
  }
  return votes
}

describe('network observer representative liveness', () => {
  it('gives a began then an ended with the outage length for a stop and resume', () => {
    const state = build_state()
    const stop_ms = START_MS + 10 * MINUTE_MS
    const resume_ms = START_MS + 30 * MINUTE_MS
    const votes = steady_votes({
      from_ms: START_MS,
      to_ms: START_MS + 40 * MINUTE_MS,
      skip: ({ account, time_ms }) =>
        account === ACCOUNT && time_ms >= stop_ms && time_ms < resume_ms
    })
    const network_events = replay({
      state,
      votes,
      until_ms: START_MS + 40 * MINUTE_MS
    })

    expect(network_events).to.have.length(2)
    const [began, ended] = network_events
    const last_vote_s = (stop_ms - 30 * 1000) / 1000
    expect(began).to.deep.include({
      network_event_phase: 'began',
      representative_account: ACCOUNT,
      observed_at: last_vote_s
    })
    expect(ended.network_event_phase).to.equal('ended')
    expect(ended.observed_at).to.equal(resume_ms / 1000)
    expect(ended.evidence.not_voting_seconds).to.equal(
      resume_ms / 1000 - last_vote_s
    )
    expect(build_network_event_row(ended).network_event_condition_id).to.equal(
      build_network_event_row(began).network_event_id
    )
  })

  it('gives no spurious events across a restart with saved state', () => {
    const state = build_state()
    const votes = steady_votes({
      from_ms: START_MS,
      to_ms: START_MS + 60 * MINUTE_MS
    })
    const restart_ms = START_MS + 20 * MINUTE_MS
    const before_restart = replay({
      state,
      votes: votes.filter(([time_ms]) => time_ms < restart_ms),
      until_ms: restart_ms - MINUTE_MS
    })
    const saved = JSON.parse(JSON.stringify(state))

    // Down for two minutes, under the threshold.
    const resumed_ms = restart_ms + 2 * MINUTE_MS
    const restored = restore_liveness_state({
      saved_state: saved,
      saved_at_ms: restart_ms - MINUTE_MS,
      now_ms: resumed_ms
    })
    const after_restart = replay({
      state: restored,
      votes: votes.filter(([time_ms]) => time_ms >= resumed_ms),
      from_ms: resumed_ms,
      until_ms: START_MS + 60 * MINUTE_MS
    })
    expect([...before_restart, ...after_restart]).to.deep.equal([])
  })

  it('gives no began within the warm-up window after a restart without state', () => {
    const restart_ms = START_MS + 100 * MINUTE_MS
    const restored = restore_liveness_state({
      saved_state: null,
      now_ms: restart_ms
    })
    update_principal_set({
      state: restored,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      now_ms: restart_ms
    })
    // ACCOUNT never votes, OTHER_ACCOUNT votes throughout.
    const votes = steady_votes({
      from_ms: restart_ms,
      to_ms: restart_ms + 20 * MINUTE_MS,
      skip: ({ account }) => account === ACCOUNT
    })
    const within_warm_up = replay({
      state: restored,
      votes,
      from_ms: restart_ms,
      until_ms: restart_ms + REPRESENTATIVE_NOT_VOTING_MS
    })
    expect(within_warm_up).to.deep.equal([])

    const after_warm_up = replay({
      state: restored,
      votes: [],
      from_ms: restart_ms + REPRESENTATIVE_NOT_VOTING_MS + MINUTE_MS,
      until_ms: restart_ms + REPRESENTATIVE_NOT_VOTING_MS + MINUTE_MS
    })
    expect(after_warm_up).to.have.length(1)
    expect(after_warm_up[0].evidence.last_vote_at).to.equal(null)
    expect(after_warm_up[0].observed_at).to.equal(restart_ms / 1000)
  })

  it('drops last votes after a restart longer than the threshold', () => {
    const state = build_state()
    record_representative_vote({
      state,
      representative_account: ACCOUNT,
      received_at_ms: START_MS
    })
    const restored = restore_liveness_state({
      saved_state: JSON.parse(JSON.stringify(state)),
      saved_at_ms: START_MS,
      now_ms: START_MS + 60 * MINUTE_MS
    })
    expect(restored.last_vote_at_ms).to.deep.equal({})
    expect(
      evaluate_representative_liveness({
        state: restored,
        now_ms: START_MS + 61 * MINUTE_MS,
        is_degraded: false
      })
    ).to.deep.equal([])
  })

  it('does not flap for a representative hovering between 0.09% and 0.1%', () => {
    const state = build_state()
    const weights = ['950', '1000', '920', '990', '905']
    for (const weight of weights) {
      update_principal_set({
        state,
        online_weight: ONLINE_WEIGHT,
        weights_by_account: { ...principal_weights, [ACCOUNT]: weight },
        now_ms: START_MS
      })
      expect(state.principal_accounts).to.include(ACCOUNT)
    }

    const outsider = create_liveness_state({ observing_since_ms: START_MS })
    for (const weight of weights) {
      update_principal_set({
        state: outsider,
        online_weight: ONLINE_WEIGHT,
        weights_by_account: { [ACCOUNT]: weight === '1000' ? '999' : weight },
        now_ms: START_MS
      })
      expect(outsider.principal_accounts).to.not.include(ACCOUNT)
    }
  })

  it('ends an open condition with left_principal_set when the representative leaves', () => {
    const state = build_state()
    const network_events = replay({
      state,
      votes: [[START_MS, OTHER_ACCOUNT]],
      until_ms: START_MS + 10 * MINUTE_MS
    })
    expect(
      network_events.map((event) => event.representative_account)
    ).to.include(ACCOUNT)

    const ended = update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: { [OTHER_ACCOUNT]: '5000', [ACCOUNT]: '800' },
      now_ms: START_MS + 11 * MINUTE_MS
    })
    const own_ended = ended.filter(
      (event) => event.representative_account === ACCOUNT
    )
    expect(own_ended).to.have.length(1)
    expect(own_ended[0].evidence.reason).to.equal('left_principal_set')
    expect(
      evaluate_representative_liveness({
        state,
        now_ms: START_MS + 20 * MINUTE_MS,
        is_degraded: false
      }).filter((event) => event.representative_account === ACCOUNT)
    ).to.deep.equal([])
  })

  it('emits no not-voting begins while degraded', () => {
    const state = build_state()
    const network_events = replay({
      state,
      votes: [],
      until_ms: START_MS + 30 * MINUTE_MS,
      is_degraded: true
    })
    expect(network_events).to.deep.equal([])
  })

  it('reports the share of principal representatives voting in a window', () => {
    const state = build_state()
    record_representative_vote({
      state,
      representative_account: ACCOUNT,
      received_at_ms: START_MS
    })
    expect(
      get_principal_voting_share({
        state,
        now_ms: START_MS + MINUTE_MS,
        window_ms: REPRESENTATIVE_NOT_VOTING_MS
      })
    ).to.equal(0.5)
  })
})

describe('network observer principal representative inputs', () => {
  const NOW_S = 1_800_000_000
  const LOADER_ACCOUNTS = [
    ACCOUNT,
    OTHER_ACCOUNT,
    `nano_1${'9'.repeat(59)}`,
    `nano_3${'8'.repeat(59)}`
  ]

  const clear_rows = async () => {
    await knex('voting_weight')
      .where('timestamp', '>=', NOW_S - 3600)
      .del()
    await knex('accounts_meta_index').whereIn('account', LOADER_ACCOUNTS).del()
  }

  before(async () => {
    await mochaGlobalSetup()
    await clear_rows()
    const voting_weight_row = (address, online_stake_total, timestamp) => ({
      address,
      quorum_delta: '0',
      online_weight_quorum_percent: 67,
      online_weight_minimum: '0',
      online_stake_total,
      trended_stake_total: '0',
      peers_stake_total: '0',
      timestamp
    })
    await knex('voting_weight').insert([
      voting_weight_row('a', '1000000', NOW_S - 60),
      voting_weight_row('b', '1000000', NOW_S - 120),
      voting_weight_row('c', '3000000', NOW_S - 180),
      // outside the 15-minute window
      voting_weight_row('d', '9000000', NOW_S - 3000)
    ])
    await knex('accounts_meta_index').insert([
      { account: ACCOUNT, weight: '900', timestamp: NOW_S },
      { account: OTHER_ACCOUNT, weight: '5000', timestamp: NOW_S },
      { account: LOADER_ACCOUNTS[2], weight: '899', timestamp: NOW_S },
      // a heavy weight not refreshed for two days is stale
      {
        account: LOADER_ACCOUNTS[3],
        weight: '900000',
        timestamp: NOW_S - 2 * 86400
      }
    ])
  })

  after(clear_rows)

  it('loads median online weight and representatives at or above the leave threshold', async () => {
    const principal_inputs = await load_principal_inputs({ now_seconds: NOW_S })
    expect(principal_inputs.online_weight).to.equal('1000000')
    expect(principal_inputs.weights_by_account).to.deep.equal({
      [ACCOUNT]: '900',
      [OTHER_ACCOUNT]: '5000'
    })
  })

  it('keeps every digit of mainnet-sized weights', async () => {
    // an hour later, so the fixture voting_weight rows are outside the window
    const now_seconds = NOW_S + 3600
    const online_weight = '86291609232434560923417823409182734091'
    const account_weight = '86291609232434560923417823409182735'
    await knex('voting_weight').insert({
      address: 'mainnet-sized',
      quorum_delta: '0',
      online_weight_quorum_percent: 67,
      online_weight_minimum: '0',
      online_stake_total: online_weight,
      trended_stake_total: '0',
      peers_stake_total: '0',
      timestamp: now_seconds - 30
    })
    await knex('accounts_meta_index')
      .where({ account: ACCOUNT })
      .update({ weight: account_weight })
    try {
      const principal_inputs = await load_principal_inputs({ now_seconds })
      expect(principal_inputs.online_weight).to.equal(online_weight)
      expect(principal_inputs.weights_by_account[ACCOUNT]).to.equal(
        account_weight
      )
    } finally {
      await knex('voting_weight').where({ address: 'mainnet-sized' }).del()
      await knex('accounts_meta_index')
        .where({ account: ACCOUNT })
        .update({ weight: '900' })
    }
  })

  it('falls back to the cached copy when the load finds nothing', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'principal-'))
    const cache_file = path.join(directory, 'principal-inputs.json')
    try {
      const loaded = await load_principal_inputs_with_cache({
        cache_file,
        now_seconds: NOW_S
      })
      const cached = await load_principal_inputs_with_cache({
        cache_file,
        now_seconds: NOW_S + 86400
      })
      expect(cached).to.deep.equal(loaded)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
