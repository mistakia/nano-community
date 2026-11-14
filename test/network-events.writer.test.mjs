/* global describe before afterEach it */
import chai from 'chai'

import knex from '#db'
import insert_network_events, {
  build_network_event_row
} from '#libs-server/network-events/insert-network-events.mjs'
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
  await knex('network_event_coverage').del()
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

  it('assigns sequences in commit order across overlapping transactions', async () => {
    const first_row = build_network_event_row(cemented_behind_began)
    const second_row = build_network_event_row({
      ...cemented_behind_began,
      evidence: { ...cemented_behind_began.evidence, began_at: 2000 },
      observed_at: 2000
    })

    const first = await knex.transaction()
    await first('network_events').insert(first_row)

    let second_committed = false
    const second = knex
      .transaction((trx) => trx('network_events').insert(second_row))
      .then(() => {
        second_committed = true
      })

    // the second insert waits on the first transaction's sequence lock
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(second_committed).to.equal(false)

    await first.commit()
    await second

    const rows = await knex('network_events').orderBy(
      'network_event_sequence',
      'asc'
    )
    expect(rows.map((row) => row.network_event_id)).to.deep.equal([
      first_row.network_event_id,
      second_row.network_event_id
    ])
    expect(rows[0].network_event_sequence).to.be.a('number')
  })

  it('refuses to update a stored event or coverage window', async () => {
    await insert_network_events({ network_events: [cemented_behind_began] })
    await knex('network_event_coverage').insert({
      producer: 'telemetry_detector',
      coverage_began_at: 1000,
      coverage_ended_at: 1300
    })

    let event_error
    try {
      await knex('network_events').update({ severity: 'critical' })
    } catch (err) {
      event_error = err
    }
    expect(event_error?.message).to.match(/immutable/)

    let coverage_error
    try {
      await knex('network_event_coverage').update({ coverage_ended_at: 2000 })
    } catch (err) {
      coverage_error = err
    }
    expect(coverage_error?.message).to.match(/immutable/)
  })

  it('keeps stored rows and sequences when the schema is re-applied', async () => {
    await insert_network_events({ network_events: [cemented_behind_began] })
    const read_sequences = () =>
      knex('network_events').select(
        'network_event_id',
        'network_event_sequence'
      )
    const before_apply = await read_sequences()
    await mochaGlobalSetup()
    expect(await read_sequences()).to.deep.equal(before_apply)
  })

  it('gives a began and its ended row one condition id and occurrences none', async () => {
    await insert_network_events({
      network_events: [
        cemented_behind_began,
        {
          ...cemented_behind_began,
          network_event_phase: 'ended',
          observed_at: 5000
        },
        {
          network_event_type: 'representative_node_changed',
          network_event_phase: 'occurred',
          representative_account: REPRESENTATIVE_ACCOUNT,
          node_id: `node_${'1'.repeat(60)}`,
          observed_at: 3000
        }
      ]
    })
    const rows = await knex('network_events')
    const began = rows.find((row) => row.network_event_phase === 'began')
    const ended = rows.find((row) => row.network_event_phase === 'ended')
    const occurred = rows.find((row) => row.network_event_phase === 'occurred')
    expect(began.network_event_condition_id).to.equal(began.network_event_id)
    expect(ended.network_event_condition_id).to.equal(began.network_event_id)
    expect(occurred.network_event_condition_id).to.equal(null)
  })

  it('commits coverage windows with their events', async () => {
    await insert_network_events({
      network_events: [cemented_behind_began],
      coverage_windows: [
        {
          producer: 'telemetry_detector',
          coverage_began_at: 700,
          coverage_ended_at: 1000
        }
      ]
    })
    const [event] = await knex('network_events')
    const [coverage] = await knex('network_event_coverage')
    expect(coverage).to.include({
      producer: 'telemetry_detector',
      coverage_began_at: 700,
      coverage_ended_at: 1000
    })
    expect(coverage.network_event_coverage_sequence).to.be.above(
      event.network_event_sequence
    )
  })

  it('leaves neither events nor coverage when the transaction rolls back', async () => {
    let error
    try {
      await insert_network_events({
        network_events: [cemented_behind_began],
        coverage_windows: [
          {
            producer: 'unknown_producer',
            coverage_began_at: 700,
            coverage_ended_at: 1000
          }
        ]
      })
    } catch (err) {
      error = err
    }
    expect(error).to.be.an('error')
    expect(await knex('network_events')).to.have.length(0)
    expect(await knex('network_event_coverage')).to.have.length(0)
  })
})
