/* global describe before beforeEach it */
import chai from 'chai'

import knex from '#db'
import {
  DETECTOR_NAME,
  detect_telemetry_network_events
} from '#root/scripts/detect-telemetry-network-events.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const SNAPSHOT_SECONDS = 300
const FIRST_SNAPSHOT = 1700000000
// snapshots 0..12 give a full 60-minute settle window ending at snapshot 12
const WINDOW_SNAPSHOTS = 13

const account = (digit) => `nano_3${String(digit).repeat(59)}`
const node_id = (digit) => `node_${String(digit).repeat(60)}`

const REP_A = account(1)
const REP_B = account(3)
const REP_C = account(4)

const snapshot_timestamp = (index) => FIRST_SNAPSHOT + index * SNAPSHOT_SECONDS

const telemetry_row = ({
  representative_account,
  address = '::ffff:10.0.0.1',
  node = node_id(1),
  maker = '0',
  major_version = 28,
  cemented_behind = 5,
  weight = 1e30,
  timestamp
}) => ({
  account: representative_account,
  weight,
  block_count: 100,
  block_behind: 0,
  cemented_count: 100,
  cemented_behind,
  account_count: 10,
  unchecked_count: 0,
  bandwidth_cap: 0,
  peer_count: 100,
  protocol_version: 20,
  uptime: 1000,
  major_version,
  minor_version: 0,
  patch_version: 0,
  pre_release_version: '0',
  maker,
  node_id: node,
  address,
  port: 7075,
  telemetry_timestamp: timestamp,
  timestamp
})

// Inserts snapshots first..last (inclusive), with rows built per snapshot index.
const insert_snapshots = async ({ first, last, rows_at }) => {
  const rows = []
  for (let index = first; index <= last; index++) {
    rows.push(
      ...rows_at(index).map((row) =>
        telemetry_row({ ...row, timestamp: snapshot_timestamp(index) })
      )
    )
  }
  await knex('representatives_telemetry').insert(rows)
}

const list_events = (network_event_type) =>
  knex('network_events')
    .where({ network_event_type })
    .orderBy('observed_at', 'asc')

const clear_tables = async () => {
  await knex('representatives_telemetry').del()
  await knex('network_events').del()
  await knex('network_event_detector_state').del()
  await knex('etl_state').where({ table_name: DETECTOR_NAME }).del()
}

describe('telemetry network event detector', () => {
  before(async () => {
    await mochaGlobalSetup()
  })

  beforeEach(clear_tables)

  it('emits nothing for a rep alternating two addresses every snapshot', async () => {
    const rows_at = (index) => [
      {
        representative_account: REP_A,
        address: index % 2 ? '::ffff:10.0.0.1' : '::ffff:10.0.0.2'
      }
    ]
    await insert_snapshots({ first: 0, last: WINDOW_SNAPSHOTS - 1, rows_at })
    await detect_telemetry_network_events()
    await insert_snapshots({ first: WINDOW_SNAPSHOTS, last: 40, rows_at })
    await detect_telemetry_network_events()

    expect(await knex('network_events')).to.have.length(0)
  })

  it('begins multiple peer addresses once when two addresses hold a full window', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [{ representative_account: REP_A }]
    })
    await detect_telemetry_network_events()

    await insert_snapshots({
      first: WINDOW_SNAPSHOTS,
      last: 40,
      rows_at: () => [
        { representative_account: REP_A },
        {
          representative_account: REP_A,
          address: '::ffff:10.0.0.2',
          node: node_id(2)
        }
      ]
    })
    await detect_telemetry_network_events()

    const events = await list_events('representative_multiple_peer_addresses')
    expect(events).to.have.length(1)
    expect(events[0].network_event_phase).to.equal('began')
    expect(events[0].observed_at).to.equal(snapshot_timestamp(WINDOW_SNAPSHOTS))
    expect(events[0].evidence.first_observation).to.equal(undefined)
    expect(events[0].evidence.peer_addresses).to.deep.equal([
      '::ffff:10.0.0.1',
      '::ffff:10.0.0.2'
    ])
  })

  it('emits one peer address change for a settled move', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [{ representative_account: REP_A }]
    })
    await detect_telemetry_network_events()

    await insert_snapshots({
      first: WINDOW_SNAPSHOTS,
      last: 40,
      rows_at: () => [
        { representative_account: REP_A, address: '::ffff:10.0.0.9' }
      ]
    })
    await detect_telemetry_network_events()

    const events = await list_events('representative_peer_address_changed')
    expect(events).to.have.length(1)
    expect(events[0].network_event_phase).to.equal('occurred')
    expect(events[0].peer_address).to.equal('::ffff:10.0.0.9')
    expect(events[0].evidence.previous_peer_address).to.equal('::ffff:10.0.0.1')
    expect(await list_events('representative_node_changed')).to.have.length(0)
  })

  it('judges versions within a maker by the majority-weight major', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [
        { representative_account: REP_A, major_version: 28, weight: 7e31 },
        {
          representative_account: REP_B,
          node: node_id(3),
          major_version: 27,
          weight: 1e30
        },
        {
          representative_account: REP_C,
          node: node_id(4),
          maker: '3',
          major_version: 3,
          weight: 1e30
        }
      ]
    })
    await detect_telemetry_network_events()

    const events = await list_events('representative_version_outdated')
    expect(events).to.have.length(1)
    expect(events[0].representative_account).to.equal(REP_B)
    expect(events[0].evidence.major_version).to.equal(27)
    expect(events[0].evidence.majority_major_version).to.equal(28)
  })

  it('begins cemented behind only when it holds for a full window', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [
        { representative_account: REP_A },
        { representative_account: REP_B, node: node_id(3) }
      ]
    })
    await detect_telemetry_network_events()

    await insert_snapshots({
      first: WINDOW_SNAPSHOTS,
      last: 2 * WINDOW_SNAPSHOTS - 1,
      rows_at: (index) => [
        { representative_account: REP_A, cemented_behind: 1001 },
        {
          representative_account: REP_B,
          node: node_id(3),
          cemented_behind: index === WINDOW_SNAPSHOTS + 6 ? 900 : 1001
        }
      ]
    })
    await detect_telemetry_network_events()

    const events = await list_events('representative_cemented_behind')
    expect(events).to.have.length(1)
    expect(events[0].representative_account).to.equal(REP_A)
    expect(events[0].network_event_phase).to.equal('began')

    await insert_snapshots({
      first: 2 * WINDOW_SNAPSHOTS,
      last: 3 * WINDOW_SNAPSHOTS,
      rows_at: () => [
        { representative_account: REP_A, cemented_behind: 10 },
        { representative_account: REP_B, node: node_id(3) }
      ]
    })
    await detect_telemetry_network_events()

    const after_recovery = await list_events('representative_cemented_behind')
    expect(after_recovery.map((e) => e.network_event_phase)).to.deep.equal([
      'began',
      'ended'
    ])
    expect(after_recovery[1].evidence.began_at).to.equal(
      after_recovery[0].evidence.began_at
    )
  })

  it('emits present conditions with first_observation and no changed events on the first run', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [
        { representative_account: REP_A, cemented_behind: 5000 },
        {
          representative_account: REP_A,
          address: '::ffff:10.0.0.2',
          node: node_id(2),
          cemented_behind: 5000
        }
      ]
    })
    const { inserted_count } = await detect_telemetry_network_events()

    const events = await knex('network_events')
    expect(inserted_count).to.equal(2)
    expect(events.map((e) => e.network_event_type).sort()).to.deep.equal([
      'representative_cemented_behind',
      'representative_multiple_peer_addresses'
    ])
    for (const event of events) {
      expect(event.network_event_phase).to.equal('began')
      expect(event.evidence.first_observation).to.equal(true)
    }
  })

  it('adds no rows when the same window is detected again', async () => {
    await insert_snapshots({
      first: 0,
      last: WINDOW_SNAPSHOTS - 1,
      rows_at: () => [{ representative_account: REP_A, cemented_behind: 5000 }]
    })
    await detect_telemetry_network_events()
    const first_count = (await knex('network_events')).length
    expect(first_count).to.equal(1)

    await detect_telemetry_network_events()
    // replay from scratch: same began window, same ids
    await knex('network_event_detector_state').del()
    await knex('etl_state').where({ table_name: DETECTOR_NAME }).del()
    const replay = await detect_telemetry_network_events()

    expect(replay.network_events).to.have.length(1)
    expect(replay.inserted_count).to.equal(0)
    expect(await knex('network_events')).to.have.length(first_count)
  })

  it('writes nothing on a first run without a full window', async () => {
    await insert_snapshots({
      first: 0,
      last: 3,
      rows_at: () => [{ representative_account: REP_A }]
    })
    const result = await detect_telemetry_network_events()
    expect(result.evaluated_count).to.equal(0)
    expect(
      await knex('etl_state').where({ table_name: DETECTOR_NAME })
    ).to.have.length(0)
  })
})
