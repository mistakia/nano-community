/* global describe before after beforeEach it */
import chai from 'chai'
import http from 'http'

import knex from '#db'
import {
  DETECTOR_NAME,
  RPC_PROBE_RESULTS,
  build_rpc_url,
  probe_rpc_address,
  probe_representative_rpc
} from '#root/scripts/probe-representative-rpc.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect

const REP_A = `nano_3${'1'.repeat(59)}`
const SNAPSHOT_SECONDS = 300
const FIRST_SNAPSHOT = 1700000000

// work_peers answer per mode; version always answers like a nano node
const WORK_PEERS_RESPONSES = {
  control_disabled: { error: 'RPC control is disabled' },
  control_enabled: { work_peers: '' },
  other_error: { error: 'Unknown command' }
}

describe('representative RPC probe', () => {
  let server
  let url
  let mode
  const user_agents = []

  before(async () => {
    server = http.createServer((req, res) => {
      user_agents.push(req.headers['user-agent'])
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        if (mode === 'timeout') return // never answer
        const { action } = JSON.parse(body)
        const response =
          action === 'version'
            ? { node_vendor: 'Nano V28.1' }
            : WORK_PEERS_RESPONSES[mode]
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(response))
      })
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${server.address().port}`
  })

  after(() => {
    server.closeAllConnections()
    server.close()
  })

  it('maps a control error to control disabled', async () => {
    mode = 'control_disabled'
    const result = await probe_rpc_address({ peer_address: '127.0.0.1', url })
    expect(result.result).to.equal(RPC_PROBE_RESULTS.control_disabled)
    expect(result.node_vendor).to.equal('Nano V28.1')
  })

  it('maps a work_peers answer to control enabled', async () => {
    mode = 'control_enabled'
    const result = await probe_rpc_address({ peer_address: '127.0.0.1', url })
    expect(result.result).to.equal(RPC_PROBE_RESULTS.control_enabled)
  })

  it('maps any other error to unknown', async () => {
    mode = 'other_error'
    const result = await probe_rpc_address({ peer_address: '127.0.0.1', url })
    expect(result.result).to.equal(RPC_PROBE_RESULTS.unknown)
  })

  it('maps a timeout to unreachable', async () => {
    mode = 'timeout'
    const result = await probe_rpc_address({
      peer_address: '127.0.0.1',
      url,
      timeout_ms: 200
    })
    expect(result.result).to.equal(RPC_PROBE_RESULTS.unreachable)
    expect(result.error).to.equal('timeout')
  })

  it('identifies itself with a nano.community user agent', () => {
    expect(user_agents.length).to.be.above(0)
    for (const user_agent of user_agents) {
      expect(user_agent).to.match(/nano\.community/)
    }
  })

  it('builds bracketed IPv6 and unwrapped IPv4-mapped URLs', () => {
    expect(build_rpc_url('2001:db8::1')).to.equal('http://[2001:db8::1]:7076')
    expect(build_rpc_url('::ffff:192.0.2.1')).to.equal('http://192.0.2.1:7076')
    expect(build_rpc_url('192.0.2.1')).to.equal('http://192.0.2.1:7076')
  })

  describe('events', () => {
    const insert_window = async () => {
      const rows = []
      for (let index = 0; index <= 12; index++) {
        const timestamp = FIRST_SNAPSHOT + index * SNAPSHOT_SECONDS
        rows.push({
          account: REP_A,
          weight: 1e30,
          block_count: 100,
          block_behind: 0,
          cemented_count: 100,
          cemented_behind: 0,
          account_count: 10,
          unchecked_count: 0,
          bandwidth_cap: 0,
          peer_count: 100,
          protocol_version: 20,
          uptime: 1000,
          major_version: 28,
          minor_version: 0,
          patch_version: 0,
          pre_release_version: '0',
          maker: '0',
          node_id: `node_${'1'.repeat(60)}`,
          address: '::ffff:192.0.2.1',
          port: 7075,
          telemetry_timestamp: timestamp,
          timestamp
        })
      }
      await knex('representatives_telemetry').insert(rows)
    }

    const stub_probe =
      (result) =>
      async ({ peer_address }) => ({
        peer_address,
        url: build_rpc_url(peer_address),
        result
      })

    beforeEach(async () => {
      await mochaGlobalSetup()
      await knex('representatives_telemetry').del()
      await knex('network_events').del()
      await knex('network_event_detector_state').del()
      await insert_window()
    })

    it('begins on the first run with first_observation and ends on change', async () => {
      await probe_representative_rpc({
        probe_address: stub_probe(RPC_PROBE_RESULTS.control_enabled),
        now: 2000000000
      })
      await probe_representative_rpc({
        probe_address: stub_probe(RPC_PROBE_RESULTS.control_enabled),
        now: 2000003600
      })
      await probe_representative_rpc({
        probe_address: stub_probe(RPC_PROBE_RESULTS.unreachable),
        now: 2000007200
      })

      const events = await knex('network_events').orderBy('observed_at')
      expect(events.map((e) => e.network_event_phase)).to.deep.equal([
        'began',
        'ended'
      ])
      expect(events[0].severity).to.equal('critical')
      expect(events[0].peer_address).to.equal('::ffff:192.0.2.1')
      expect(events[0].evidence.first_observation).to.equal(true)
      expect(events[1].evidence.began_at).to.equal(2000000000)
      const state = await knex('network_event_detector_state')
        .where({ detector_name: DETECTOR_NAME })
        .first()
      expect(state.detector_state).to.deep.equal({ open: {} })
    })

    it('writes nothing on a dry run', async () => {
      const { network_events } = await probe_representative_rpc({
        probe_address: stub_probe(RPC_PROBE_RESULTS.control_enabled),
        dry_run: true
      })
      expect(network_events).to.have.length(1)
      expect(await knex('network_events')).to.have.length(0)
      expect(await knex('network_event_detector_state')).to.have.length(0)
    })
  })
})
