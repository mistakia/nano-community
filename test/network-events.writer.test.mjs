/* global describe before afterEach it */
import chai from 'chai'

import knex from '#db'
import insert_network_events from '#libs-server/network-events/insert-network-events.mjs'
import build_network_event_id from '#libs-server/network-events/build-network-event-id.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const REPRESENTATIVE_ACCOUNT = `nano_3${'1'.repeat(59)}`
const DETECTOR_NAME = 'writer-test'
const WATERMARK_KEY = 'writer-test-watermark'

const cemented_behind_began = {
  network_event_type: 'representative_cemented_behind',
  network_event_phase: 'began',
  representative_account: REPRESENTATIVE_ACCOUNT,
  evidence: { began_at: 1000, cemented_behind: [1500, 1600] },
  observed_at: 1000
}

const clear_tables = async () => {
  await knex('network_events').del()
  await knex('network_event_detector_state').del()
  await knex('etl_state').where({ table_name: WATERMARK_KEY }).del()
}

describe('network events writer', () => {
  before(async () => {
    await mochaGlobalSetup()
    await clear_tables()
  })

  afterEach(clear_tables)

  it('leaves one row when the same event is inserted twice', async () => {
    const first = await insert_network_events({
      network_events: [cemented_behind_began]
    })
    const second = await insert_network_events({
      network_events: [cemented_behind_began]
    })
    expect(first.inserted_count).to.equal(1)
    expect(second.inserted_count).to.equal(0)

    const rows = await knex('network_events')
    expect(rows).to.have.length(1)
    expect(rows[0].severity).to.equal('warning')
    expect(rows[0].evidence).to.deep.equal(cemented_behind_began.evidence)
    expect(rows[0].recorded_at).to.be.a('number')
  })

  it('links an ended event to its began event through the began keys', () => {
    const ended = {
      ...cemented_behind_began,
      network_event_phase: 'ended',
      observed_at: 5000
    }
    expect(build_network_event_id(ended)).to.not.equal(
      build_network_event_id(cemented_behind_began)
    )
    expect(build_network_event_id({ ...ended, observed_at: 9000 })).to.equal(
      build_network_event_id(ended)
    )
  })

  it('rejects an occurrence with phase began', async () => {
    let error
    try {
      await insert_network_events({
        network_events: [
          {
            network_event_type: 'representative_node_changed',
            network_event_phase: 'began',
            representative_account: REPRESENTATIVE_ACCOUNT,
            node_id: `node_${'1'.repeat(60)}`,
            observed_at: 1000
          }
        ]
      })
    } catch (err) {
      error = err
    }
    expect(error?.message).to.match(/invalid network_event_phase/)
    expect(await knex('network_events')).to.have.length(0)
  })

  it('rolls back the state and watermark writes when the insert fails', async () => {
    let error
    try {
      await insert_network_events({
        detector_name: DETECTOR_NAME,
        detector_states: [
          { subject_key: REPRESENTATIVE_ACCOUNT, detector_state: { open: {} } }
        ],
        watermark: { table_name: WATERMARK_KEY, last_max_ts: 1000 },
        network_events: [
          {
            ...cemented_behind_began,
            // longer than varchar(65), so the database rejects the insert
            peer_address: 'x'.repeat(80)
          }
        ]
      })
    } catch (err) {
      error = err
    }
    expect(error).to.be.an('error')
    expect(await knex('network_events')).to.have.length(0)
    expect(await knex('network_event_detector_state')).to.have.length(0)
    expect(
      await knex('etl_state').where({ table_name: WATERMARK_KEY })
    ).to.have.length(0)
  })

  it('writes the state and watermark with the events', async () => {
    await insert_network_events({
      detector_name: DETECTOR_NAME,
      detector_states: [
        { subject_key: REPRESENTATIVE_ACCOUNT, detector_state: { open: {} } }
      ],
      watermark: { table_name: WATERMARK_KEY, last_max_ts: 1000 },
      network_events: [cemented_behind_began]
    })
    await insert_network_events({
      detector_name: DETECTOR_NAME,
      detector_states: [
        {
          subject_key: REPRESENTATIVE_ACCOUNT,
          detector_state: { open: { representative_cemented_behind: {} } }
        }
      ],
      watermark: { table_name: WATERMARK_KEY, last_max_ts: 2000 }
    })
    const state = await knex('network_event_detector_state').first()
    expect(state.detector_state).to.deep.equal({
      open: { representative_cemented_behind: {} }
    })
    const watermark = await knex('etl_state')
      .where({ table_name: WATERMARK_KEY })
      .first()
    expect(watermark.last_max_ts).to.equal(2000)
  })
})
