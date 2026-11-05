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

const began = ({
  network_event_type,
  representative_account,
  observed_at
}) => ({
  network_event_type,
  network_event_phase: 'began',
  representative_account,
  evidence: { began_at: observed_at },
  observed_at
})

// 12 public events, newest first by observed_at = 1000 + index
const PUBLIC_EVENTS = Array.from({ length: 12 }, (_, index) =>
  began({
    network_event_type:
      index % 2
        ? 'representative_cemented_behind'
        : 'representative_multiple_peer_addresses',
    representative_account: index < 4 ? REP_B : REP_A,
    observed_at: 1000 + index
  })
)
const OPERATOR_ONLY_EVENT = began({
  network_event_type: 'representative_rpc_control_enabled',
  representative_account: REP_A,
  observed_at: 5000
})

const get_events = (query = {}) =>
  chai.request(server).get('/api/network/events').query(query)

describe('API /network', () => {
  before(async () => {
    await mochaGlobalSetup()
    await knex('network_events').del()
    await insert_network_events({
      network_events: [...PUBLIC_EVENTS, OPERATOR_ONLY_EVENT]
    })
  })

  beforeEach(() => cache.flushAll())

  after(async () => {
    await knex('network_events').del()
    cache.flushAll()
  })

  it('still serves the network stats at /api/network', async () => {
    const stats = { nanodb: { count: 1 }, current_price_usd: 1.5 }
    cache.set('stats', stats)
    const response = await chai.request(server).get('/api/network')
    expect(response).to.have.status(200)
    expect(response.body).to.deep.equal(stats)
  })

  it('lists public events newest first', async () => {
    const response = await get_events()
    expect(response).to.have.status(200)
    expect(response.body).to.have.length(PUBLIC_EVENTS.length)
    expect(response.body.map((e) => e.observed_at)).to.deep.equal(
      PUBLIC_EVENTS.map((e) => e.observed_at).reverse()
    )
  })

  it('pages with limit and offset, capping limit at 100', async () => {
    const first_page = await get_events({ limit: 5 })
    const last_page = await get_events({ limit: 5, offset: 10 })
    const past_end = await get_events({ limit: 5, offset: 12 })
    const capped = await get_events({ limit: 1000 })
    expect(first_page.body.map((e) => e.observed_at)).to.deep.equal([
      1011, 1010, 1009, 1008, 1007
    ])
    expect(last_page.body.map((e) => e.observed_at)).to.deep.equal([1001, 1000])
    expect(past_end.body).to.deep.equal([])
    expect(capped).to.have.status(200)
    expect(capped.body).to.have.length(PUBLIC_EVENTS.length)
    expect((await get_events({ limit: 0 })).status).to.equal(400)
    expect((await get_events({ offset: -1 })).status).to.equal(400)
  })

  it('returns different pages for requests differing only in offset', async () => {
    const first = await get_events({ limit: 3, offset: 0 })
    const second = await get_events({ limit: 3, offset: 3 })
    expect(first.body[0].network_event_id).to.not.equal(
      second.body[0].network_event_id
    )
  })

  it('filters by type, representative and severity', async () => {
    const by_type = await get_events({
      network_event_type: 'representative_cemented_behind'
    })
    expect(by_type.body).to.have.length(6)
    for (const event of by_type.body) {
      expect(event.network_event_type).to.equal(
        'representative_cemented_behind'
      )
    }

    const by_representative = await get_events({
      representative_account: REP_B
    })
    expect(by_representative.body).to.have.length(4)

    const by_severity = await get_events({ severity: 'info' })
    expect(by_severity.body).to.have.length(6)
    for (const event of by_severity.body) {
      expect(event.severity).to.equal('info')
    }
    expect((await get_events({ severity: 'critical' })).body).to.deep.equal([])
  })

  it('rejects an unknown filter value with 400', async () => {
    expect(
      (await get_events({ network_event_type: 'not_a_type' })).status
    ).to.equal(400)
    expect(
      (await get_events({ representative_account: 'nano_bad' })).status
    ).to.equal(400)
    expect((await get_events({ severity: 'severe' })).status).to.equal(400)
  })

  it('never lists an operator-only event', async () => {
    const response = await get_events({ limit: 100 })
    expect(response.body.map((e) => e.network_event_type)).to.not.include(
      'representative_rpc_control_enabled'
    )
    const filtered = await get_events({
      network_event_type: 'representative_rpc_control_enabled'
    })
    expect(filtered.status).to.equal(400)
  })

  it('returns a public event by id', async () => {
    const network_event_id = build_network_event_id(PUBLIC_EVENTS[0])
    const response = await chai
      .request(server)
      .get(`/api/network/events/${network_event_id}`)
    expect(response).to.have.status(200)
    expect(response.body.network_event_id).to.equal(network_event_id)
    expect(response.body.evidence).to.deep.equal({ began_at: 1000 })
  })

  it('returns 404 for an operator-only event by id', async () => {
    const network_event_id = build_network_event_id(OPERATOR_ONLY_EVENT)
    expect(
      await knex('network_events').where({ network_event_id })
    ).to.have.length(1)
    const response = await chai
      .request(server)
      .get(`/api/network/events/${network_event_id}`)
    expect(response).to.have.status(404)
  })
})
