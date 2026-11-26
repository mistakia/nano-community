/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import { hash_signed_message } from 'nano-signed-message'

import server from '#api/server.mjs'
import db from '#db'
import { loadRepresentatives } from '#api/routes/representatives/index.mjs'
import {
  load_representative_hardware_reports,
  load_representative_power_readings
} from '#libs-server/load-representative-power-inputs.mjs'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  now_seconds,
  sign_community_request
} from './utils/sign-community-request.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const DAY_SECONDS = 24 * 60 * 60

const post_message = (body) =>
  chai.request(server).post('/api/auth/message').send(body)

const digest_of = (wire) =>
  Buffer.from(hash_signed_message(wire.message)).toString('hex')

const stored_messages = (wire) =>
  db('nano_community_messages').where({ message_digest: digest_of(wire) })

const create_representative = async ({ representative = true } = {}) => {
  const key = create_test_key()
  await db('accounts').insert({ account: key.account, representative })
  return key
}

const reading_content = (overrides = {}) => {
  const measurement_ended_at = now_seconds() - 60
  return {
    energy_watt_hours: 1681,
    measurement_method: 'wall_meter',
    measurement_started_at: measurement_ended_at - DAY_SECONDS,
    measurement_ended_at,
    ...overrides
  }
}

const sign_reading = ({ key, content = reading_content(), references = [] }) =>
  sign_community_request({
    key,
    action: 'set_representative_power_reading',
    parameters: { content, references, tags: [] }
  })

describe('representative power readings', function () {
  this.timeout(10000)

  before(mochaGlobalSetup)

  describe('POST /api/auth/message set_representative_power_reading', () => {
    it('stores a valid reading once', async () => {
      const key = await create_representative()
      const content = reading_content({
        measurement_method: 'baseboard_management_controller'
      })
      const wire = sign_reading({ key, content })

      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.stored).to.equal(true)
      expect(response.body.account).to.equal(key.account)

      const replay = await post_message(wire)
      expect(replay).to.have.status(200)
      expect(replay.body.stored).to.equal(false)

      const rows = await stored_messages(wire)
      expect(rows).to.have.length(1)
      expect(rows[0].operation).to.equal('SET_REPRESENTATIVE_POWER_READING')
      expect(JSON.parse(rows[0].content)).to.deep.equal(content)
    })

    it('accepts a reading signed by a key linked to a representative', async () => {
      const representative_key = await create_representative()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: representative_key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: new Date()
      })

      const wire = sign_reading({ key: linked_key })
      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.account).to.equal(representative_key.account)
      expect(await stored_messages(wire)).to.have.length(1)
    })

    const window_end = () => now_seconds() - 60
    const rejected = [
      [
        'a missing key',
        () => {
          const { measurement_method, ...content } = reading_content()
          return { content }
        }
      ],
      ['an extra key', () => ({ content: reading_content({ watts: 70 }) })],
      [
        'a string energy',
        () => ({
          content: reading_content({ energy_watt_hours: '1680' })
        })
      ],
      [
        'a zero energy',
        () => ({
          content: reading_content({ energy_watt_hours: 0 })
        })
      ],
      [
        'a negative energy',
        () => ({
          content: reading_content({ energy_watt_hours: -5 })
        })
      ],
      [
        'an unknown method',
        () => ({
          content: reading_content({ measurement_method: 'rapl' })
        })
      ],
      [
        'a CPU TDP specification as the method',
        () => ({
          content: reading_content({
            measurement_method: 'cpu_tdp_specification'
          })
        })
      ],
      [
        'millisecond timestamps',
        () => {
          const measurement_ended_at = window_end() * 1000
          return {
            content: reading_content({
              measurement_started_at: measurement_ended_at - DAY_SECONDS * 1000,
              measurement_ended_at
            })
          }
        }
      ],
      [
        'an ISO timestamp',
        () => ({
          content: reading_content({
            measurement_ended_at: new Date().toISOString()
          })
        })
      ],
      [
        'a window under 24 hours',
        () => ({
          content: reading_content({
            measurement_started_at: window_end() - DAY_SECONDS + 1,
            measurement_ended_at: window_end()
          })
        })
      ],
      [
        'a window that ends before it starts',
        () => ({
          content: reading_content({
            measurement_started_at: window_end(),
            measurement_ended_at: window_end() - DAY_SECONDS
          })
        })
      ],
      [
        'a window ending after issued_at',
        () => ({
          content: reading_content({
            measurement_started_at: now_seconds() - DAY_SECONDS + 3600,
            measurement_ended_at: now_seconds() + 3600
          })
        })
      ],
      ['a block reference', () => ({ references: ['ab'.repeat(32)] })]
    ]
    for (const [label, build] of rejected) {
      it(`rejects ${label} and stores nothing`, async () => {
        const key = await create_representative()
        const wire = sign_reading({ key, ...build() })
        const response = await post_message(wire)
        expect(response).to.have.status(400)
        expect(await stored_messages(wire)).to.have.length(0)
      })
    }

    for (const [label, build_key] of [
      [
        'an account that is not a representative',
        () => create_representative({ representative: false })
      ],
      ['an account the site does not know', async () => create_test_key()]
    ]) {
      it(`rejects a reading for ${label} and stores nothing`, async () => {
        const wire = sign_reading({ key: await build_key() })
        const response = await post_message(wire)
        expect(response).to.have.status(400)
        expect(await stored_messages(wire)).to.have.length(0)
      })
    }
  })

  describe('read path', () => {
    // Stores a signed reading as the route does, in a chosen arrival order
    const store = async (wire) => {
      const payload = JSON.parse(wire.message)
      await db('nano_community_messages').insert({
        version: 2,
        message: wire.message,
        message_digest: digest_of(wire),
        public_key: key_of(wire),
        operation: 'SET_REPRESENTATIVE_POWER_READING',
        content: JSON.stringify(payload.parameters.content),
        created_at: payload.issued_at,
        signature: wire.signature
      })
    }
    const keys_by_message = new Map()
    const key_of = (wire) => keys_by_message.get(wire.message)
    const sign_at = ({ key, issued_at, content }) => {
      const wire = sign_community_request({
        key,
        action: 'set_representative_power_reading',
        issued_at,
        parameters: { content, references: [], tags: [] }
      })
      keys_by_message.set(wire.message, key.public_key)
      return wire
    }

    const measurement_ended_at = now_seconds() - 3600
    const window = (energy_watt_hours) => ({
      energy_watt_hours,
      measurement_method: 'wall_meter',
      measurement_started_at: measurement_ended_at - 2 * DAY_SECONDS,
      measurement_ended_at
    })

    it('keeps the latest reading by window end, then issued_at, then digest, in any arrival order', async () => {
      for (const reverse of [false, true]) {
        const key = await create_representative()
        const issued_at = now_seconds()
        const earlier = sign_at({
          key,
          issued_at: issued_at - 60,
          content: window(100)
        })
        const [low, high] = [
          sign_at({ key, issued_at, content: window(200) }),
          sign_at({ key, issued_at, content: window(300) })
        ].sort((a, b) => (digest_of(a) < digest_of(b) ? -1 : 1))
        const older_window = sign_at({
          key,
          issued_at: issued_at + 60,
          content: {
            ...window(400),
            measurement_started_at: measurement_ended_at - 3 * DAY_SECONDS,
            measurement_ended_at: measurement_ended_at - DAY_SECONDS
          }
        })
        const arrival = [earlier, high, low, older_window]
        for (const wire of reverse ? arrival.reverse() : arrival) {
          await store(wire)
        }

        const readings = await load_representative_power_readings({
          accounts: [key.account]
        })
        const reading = readings.get(key.account)
        expect(reading.message_digest, String(reverse)).to.equal(
          digest_of(high)
        )
        expect(reading.issued_at).to.equal(issued_at)
        expect(reading.average_power_watts).to.equal(
          JSON.parse(high.message).parameters.content.energy_watt_hours / 48
        )
      }
    })

    it('counts a reading signed by a linked key for its account', async () => {
      const representative_key = await create_representative()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: representative_key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: new Date(Date.now() - 3600 * 1000)
      })
      const wire = sign_at({
        key: linked_key,
        issued_at: now_seconds(),
        content: window(1440)
      })
      await store(wire)

      const readings = await load_representative_power_readings({
        accounts: [representative_key.account, linked_key.account]
      })
      expect(readings.get(representative_key.account).message_digest).to.equal(
        digest_of(wire)
      )
      expect(readings.has(linked_key.account)).to.equal(false)
    })

    it('attaches the current reading to each cached representative row', async () => {
      const measured = await create_representative()
      const unmeasured = await create_representative()
      await db('accounts')
        .update({ last_seen_at: new Date() })
        .whereIn('account', [measured.account, unmeasured.account])
      const wire = sign_at({
        key: measured,
        issued_at: now_seconds(),
        content: window(1680)
      })
      await store(wire)

      const representatives = await loadRepresentatives()
      const row = (key) =>
        representatives.find((r) => r.account === key.account)
      expect(row(measured).power_reading).to.deep.equal({
        energy_watt_hours: 1680,
        average_power_watts: 35,
        measurement_method: 'wall_meter',
        measurement_started_at: measurement_ended_at - 2 * DAY_SECONDS,
        measurement_ended_at,
        issued_at: JSON.parse(wire.message).issued_at,
        message_digest: digest_of(wire)
      })
      expect(row(unmeasured).power_reading).to.equal(null)
    })
  })

  describe('POST /api/auth/message set_representative_hardware', () => {
    const hardware_content = (overrides = {}) => ({
      cpu_model: 'AMD EPYC-Rome Processor',
      logical_cpus: 8,
      memory_bytes: 16 * 1024 ** 3,
      storage: [{ kind: 'ssd', bytes: 400 * 1000 ** 3 }],
      virtualization: 'kvm',
      cpu_utilization_basis_points: 2000,
      utilization_window_seconds: 3 * DAY_SECONDS,
      node_cpu_utilization_basis_points: 1500,
      ...overrides
    })
    const sign_hardware = ({
      key,
      content = hardware_content(),
      references = []
    }) =>
      sign_community_request({
        key,
        action: 'set_representative_hardware',
        parameters: { content, references, tags: [] }
      })

    it('stores a valid report once and attaches its estimate', async () => {
      const key = await create_representative()
      const wire = sign_hardware({ key })
      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.stored).to.equal(true)
      expect((await post_message(wire)).body.stored).to.equal(false)
      expect(await stored_messages(wire)).to.have.length(1)

      const reports = await load_representative_hardware_reports({
        accounts: [key.account]
      })
      const report = reports.get(key.account)
      expect(report.cpu_generation).to.equal('epyc_2nd_gen')
      expect(report.estimated_power_watts).to.be.a('number').above(0)
      expect(report.message_digest).to.equal(digest_of(wire))
    })

    it('stores a report whose CPU it cannot place, with no estimate', async () => {
      const key = await create_representative()
      const wire = sign_hardware({
        key,
        content: hardware_content({
          cpu_model: 'QEMU Virtual CPU version 2.5+',
          node_cpu_utilization_basis_points: null
        })
      })
      expect(await post_message(wire)).to.have.status(200)
      const reports = await load_representative_hardware_reports({
        accounts: [key.account]
      })
      expect(reports.get(key.account).estimated_power_watts).to.equal(null)
    })

    const rejected = [
      [
        'a missing key',
        () => {
          const { virtualization, ...content } = hardware_content()
          return { content }
        }
      ],
      [
        'an empty CPU model',
        () => ({ content: hardware_content({ cpu_model: ' ' }) })
      ],
      ['zero CPUs', () => ({ content: hardware_content({ logical_cpus: 0 }) })],
      [
        'an unknown storage kind',
        () => ({
          content: hardware_content({ storage: [{ kind: 'tape', bytes: 1 }] })
        })
      ],
      [
        'an extra storage key',
        () => ({
          content: hardware_content({
            storage: [{ kind: 'ssd', bytes: 1, model: 'x' }]
          })
        })
      ],
      [
        'utilization over 100%',
        () => ({
          content: hardware_content({ cpu_utilization_basis_points: 10001 })
        })
      ],
      [
        'under a day of uptime',
        () => ({
          content: hardware_content({
            utilization_window_seconds: DAY_SECONDS - 1
          })
        })
      ],
      [
        'a free-text virtualization',
        () => ({
          content: hardware_content({ virtualization: 'Some VPS' })
        })
      ],
      ['a block reference', () => ({ references: ['ab'.repeat(32)] })]
    ]
    for (const [label, build] of rejected) {
      it(`rejects ${label} and stores nothing`, async () => {
        const key = await create_representative()
        const wire = sign_hardware({ key, ...build() })
        expect(await post_message(wire)).to.have.status(400)
        expect(await stored_messages(wire)).to.have.length(0)
      })
    }

    it('rejects a report for an account that is not a representative', async () => {
      const wire = sign_hardware({
        key: await create_representative({ representative: false })
      })
      expect(await post_message(wire)).to.have.status(400)
      expect(await stored_messages(wire)).to.have.length(0)
    })
  })
})
