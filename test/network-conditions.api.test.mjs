/* global describe before beforeEach after it */
import chai from 'chai'
import chaiHTTP from 'chai-http'

import server from '#api/server.mjs'
import cache from '#api/cache.mjs'
import knex from '#db'
import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'
import build_network_event_id from '#libs-server/network-events/build-network-event-id.mjs'
import { mochaGlobalSetup } from './global.mjs'

chai.use(chaiHTTP)
const expect = chai.expect

const REP_A = `nano_3${'1'.repeat(59)}`
const REP_B = `nano_3${'3'.repeat(59)}`

const condition = ({
  network_event_type,
  network_event_phase = 'began',
  representative_account,
  began_at,
  observed_at = began_at
}) => ({
  network_event_type,
  network_event_phase,
  representative_account,
  evidence: { began_at },
  observed_at
})

const OPEN_CONDITION = condition({
  network_event_type: 'representative_cemented_behind',
  representative_account: REP_A,
  began_at: 1000
})
const CLOSED_CONDITION = condition({
  network_event_type: 'representative_multiple_peer_addresses',
  representative_account: REP_B,
  began_at: 1100
})
const OPERATOR_ONLY_CONDITION = condition({
  network_event_type: 'representative_rpc_control_enabled',
  representative_account: REP_A,
  began_at: 1200
})

const get_conditions = (query = {}) =>
  chai.request(server).get('/api/network/conditions').query(query)

describe('API /network/conditions', () => {
  before(async () => {
    await mochaGlobalSetup()
    await knex('network_events').del()
    await knex('network_event_coverage').del()
    await insert_network_events({
      network_events: [
        OPEN_CONDITION,
        CLOSED_CONDITION,
        {
          ...CLOSED_CONDITION,
          network_event_phase: 'ended',
          observed_at: 1500
        },
        OPERATOR_ONLY_CONDITION
      ],
      coverage_windows: [
        {
          producer: 'telemetry_detector',
          coverage_began_at: 1000,
          coverage_ended_at: 1300
        },
        {
          producer: 'telemetry_detector',
          coverage_began_at: 1300,
          coverage_ended_at: 1600
        }
      ]
    })
  })

  beforeEach(() => cache.flushAll())

  after(async () => {
    await knex('network_events').del()
    await knex('network_event_coverage').del()
    cache.flushAll()
  })

  it('returns only open public conditions with producer coverage', async () => {
    const response = await get_conditions()
    expect(response).to.have.status(200)
    expect(
      response.body.network_conditions.map((e) => e.network_event_id)
    ).to.deep.equal([build_network_event_id(OPEN_CONDITION)])
    expect(response.body.producer_coverage).to.deep.equal([
      { producer: 'telemetry_detector', coverage_ended_at: 1600 }
    ])
  })

  it('filters by representative', async () => {
    const for_rep_b = await get_conditions({ representative_account: REP_B })
    expect(for_rep_b.body.network_conditions).to.deep.equal([])
    const for_rep_a = await get_conditions({ representative_account: REP_A })
    expect(for_rep_a.body.network_conditions).to.have.length(1)
    expect(
      (await get_conditions({ representative_account: 'nano_bad' })).status
    ).to.equal(400)
  })
})
