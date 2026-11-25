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

  it('keeps one open condition for a stalled node that votes every few minutes', () => {
    // The 2026-11 mainnet case: a node far behind the ledger stays online and
    // casts a lone vote every 7 to 90 minutes.
    const state = build_state()
    const gaps_minutes = [7, 23, 88, 12, 40, 9, 24]
    const sparse_votes = []
    let time_ms = START_MS
    for (const gap of gaps_minutes) {
      time_ms += gap * MINUTE_MS
      sparse_votes.push([time_ms, ACCOUNT])
    }
    const until_ms = time_ms + MINUTE_MS
    const votes = [
      ...steady_votes({
        from_ms: START_MS,
        to_ms: until_ms,
        skip: ({ account }) => account === ACCOUNT
      }),
      ...sparse_votes
    ].sort((a, b) => a[0] - b[0])
    const network_events = replay({ state, votes, until_ms })
    const own = network_events.filter(
      (event) => event.representative_account === ACCOUNT
    )
    expect(own.map((event) => event.network_event_phase)).to.deep.equal([
      'began'
    ])
    expect(state.open_conditions[ACCOUNT]).to.not.equal(undefined)
  })

  it('restarts the recovery when a resumed representative falls silent again', () => {
    const state = build_state()
    const network_events = replay({
      state,
      votes: [
        [START_MS + 10 * MINUTE_MS, ACCOUNT],
        [START_MS + 12 * MINUTE_MS, ACCOUNT],
        // silent past the threshold, so the recovery starts over here
        [START_MS + 20 * MINUTE_MS, ACCOUNT],
        [START_MS + 23 * MINUTE_MS, ACCOUNT],
        [START_MS + 26 * MINUTE_MS, ACCOUNT]
      ],
      until_ms: START_MS + 30 * MINUTE_MS
    })
    const own = network_events.filter(
      (event) => event.representative_account === ACCOUNT
    )
    expect(own.map((event) => event.network_event_phase)).to.deep.equal([
      'began',
      'ended'
    ])
    expect(own[1].observed_at).to.equal((START_MS + 20 * MINUTE_MS) / 1000)
    expect(own[1].evidence.confirmed_at).to.equal(
      (START_MS + 26 * MINUTE_MS) / 1000
    )
    expect(own[1].evidence).to.not.have.property('recovering_since_ms')
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

    const recovering = build_state()
    recovering.open_conditions[ACCOUNT] = {
      began_at: START_MS / 1000,
      last_vote_at: START_MS / 1000,
      observing_since: START_MS / 1000,
      recovering_since_ms: START_MS + 10 * MINUTE_MS
    }
    const restored_open = restore_liveness_state({
      saved_state: JSON.parse(JSON.stringify(recovering)),
      saved_at_ms: START_MS + 10 * MINUTE_MS,
      now_ms: START_MS + 60 * MINUTE_MS
    })
    expect(restored_open.open_conditions[ACCOUNT]).to.deep.equal({
      began_at: START_MS / 1000,
      last_vote_at: START_MS / 1000,
      observing_since: START_MS / 1000
    })
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

  it('ends an open condition with fell_behind and judges nothing while behind', () => {
    const state = build_state()
    const silent = replay({
      state,
      votes: [[START_MS, OTHER_ACCOUNT]],
      until_ms: START_MS + 10 * MINUTE_MS
    }).filter((event) => event.representative_account === ACCOUNT)
    expect(silent.map((event) => event.network_event_phase)).to.deep.equal([
      'began'
    ])

    const ended = update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [ACCOUNT],
      now_ms: START_MS + 11 * MINUTE_MS
    })
    expect(ended).to.have.length(1)
    expect(ended[0].network_event_phase).to.equal('ended')
    expect(ended[0].evidence.reason).to.equal('fell_behind')
    expect(
      build_network_event_row(ended[0]).network_event_condition_id
    ).to.equal(build_network_event_row(silent[0]).network_event_id)

    // a node behind the frontier voting in short bursts hours apart
    const burst_votes = []
    for (let hour = 1; hour <= 6; hour++) {
      for (let second = 0; second <= 8 * 60; second += 30) {
        burst_votes.push([
          START_MS + hour * 60 * MINUTE_MS + second * 1000,
          ACCOUNT
        ])
      }
    }
    const behind_events = replay({
      state,
      votes: burst_votes,
      from_ms: START_MS + 12 * MINUTE_MS,
      until_ms: START_MS + 7 * 60 * MINUTE_MS
    }).filter((event) => event.representative_account === ACCOUNT)
    expect(behind_events).to.deep.equal([])
  })

  it('judges a representative that catches up from its return to sync', () => {
    const state = build_state()
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [ACCOUNT],
      now_ms: START_MS
    })
    record_representative_vote({
      state,
      representative_account: ACCOUNT,
      received_at_ms: START_MS
    })
    expect(
      replay({
        state,
        votes: [],
        until_ms: START_MS + 60 * MINUTE_MS
      }).filter((event) => event.representative_account === ACCOUNT)
    ).to.deep.equal([])

    const caught_up_at_ms = START_MS + 61 * MINUTE_MS
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [],
      now_ms: caught_up_at_ms
    })
    const network_events = replay({
      state,
      votes: [],
      from_ms: caught_up_at_ms,
      until_ms: caught_up_at_ms + 10 * MINUTE_MS
    }).filter((event) => event.representative_account === ACCOUNT)
    expect(network_events).to.have.length(1)
    expect(network_events[0].network_event_phase).to.equal('began')
    expect(network_events[0].observed_at).to.equal(
      Math.floor(caught_up_at_ms / 1000)
    )
    expect(network_events[0].evidence.last_vote_at).to.equal(
      Math.floor(START_MS / 1000)
    )
  })

  it('judges a caught-up representative that votes again from that vote', () => {
    const state = build_state()
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [ACCOUNT],
      now_ms: START_MS
    })
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [],
      now_ms: START_MS + MINUTE_MS
    })
    const network_events = replay({
      state,
      votes: [
        [START_MS + 2 * MINUTE_MS, ACCOUNT],
        [START_MS + 2 * MINUTE_MS, OTHER_ACCOUNT]
      ],
      until_ms: START_MS + 3 * MINUTE_MS
    })
    expect(network_events).to.deep.equal([])
    expect(state.caught_up_at_ms).to.deep.equal({})
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

  it('leaves representatives behind the frontier out of the voting share', () => {
    const state = build_state()
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [OTHER_ACCOUNT],
      now_ms: START_MS
    })
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
    ).to.equal(1)
  })

  it('keeps the behind set and a pending return to sync across a restart', () => {
    const state = build_state()
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [ACCOUNT, OTHER_ACCOUNT],
      now_ms: START_MS
    })
    update_principal_set({
      state,
      online_weight: ONLINE_WEIGHT,
      weights_by_account: principal_weights,
      behind_accounts: [OTHER_ACCOUNT],
      now_ms: START_MS + MINUTE_MS
    })
    const restored = restore_liveness_state({
      saved_state: JSON.parse(JSON.stringify(state)),
      saved_at_ms: START_MS + MINUTE_MS,
      now_ms: START_MS + 2 * MINUTE_MS
    })
    expect(restored.behind_accounts).to.deep.equal([OTHER_ACCOUNT])
    expect(restored.caught_up_at_ms).to.deep.equal({
      [ACCOUNT]: START_MS + MINUTE_MS
    })
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

  const behind_condition = ({ account, phase, began_at }) =>
    build_network_event_row({
      network_event_type: 'representative_cemented_behind',
      network_event_phase: phase,
      representative_account: account,
      evidence: { began_at },
      observed_at: began_at
    })

  const clear_rows = async () => {
    await knex('voting_weight')
      .where('timestamp', '>=', NOW_S - 3600)
      .del()
    await knex('accounts_meta_index').whereIn('account', LOADER_ACCOUNTS).del()
    await knex('network_events')
      .where({ network_event_type: 'representative_cemented_behind' })
      .whereIn('representative_account', LOADER_ACCOUNTS)
      .del()
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
    await knex('network_events').insert([
      // open: behind
      behind_condition({
        account: OTHER_ACCOUNT,
        phase: 'began',
        began_at: NOW_S - 600
      }),
      // ended: back in sync
      behind_condition({
        account: ACCOUNT,
        phase: 'began',
        began_at: NOW_S - 900
      }),
      behind_condition({
        account: ACCOUNT,
        phase: 'ended',
        began_at: NOW_S - 900
      })
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
    expect(principal_inputs.behind_accounts).to.deep.equal([OTHER_ACCOUNT])
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
