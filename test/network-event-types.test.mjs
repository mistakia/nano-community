/* global describe it */
import chai from 'chai'
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  NETWORK_EVENT_TYPES,
  NETWORK_EVENT_KINDS,
  NETWORK_EVENT_SEVERITIES,
  PUBLIC_NETWORK_EVENT_TYPES,
  is_valid_network_event_phase,
  resolve_network_event_severity
} from '#common/network-event-types.mjs'
import {
  get_representative_uptime_share,
  is_representative_low_uptime,
  is_representative_cemented_behind
} from '#common/representative-alert-rules.mjs'

const expect = chai.expect
const __dirname = dirname(fileURLToPath(import.meta.url))

describe('network event types registry', () => {
  it('gives every type a label, kind, severity, public flag and identity keys', () => {
    for (const [network_event_type, event_type] of Object.entries(
      NETWORK_EVENT_TYPES
    )) {
      expect(event_type.label, network_event_type).to.be.a('string')
      expect(event_type.label.length, network_event_type).to.be.above(0)
      expect(Object.values(NETWORK_EVENT_KINDS)).to.include(event_type.kind)
      expect(NETWORK_EVENT_SEVERITIES).to.include(event_type.severity)
      expect(event_type.public, network_event_type).to.be.a('boolean')
      expect(event_type.network_event_id_keys, network_event_type).to.be.an(
        'array'
      )
      expect(
        event_type.network_event_id_keys.length,
        network_event_type
      ).to.be.above(0)
    }
  })

  it('accepts only began and ended for conditions and occurred for occurrences', () => {
    for (const [network_event_type, event_type] of Object.entries(
      NETWORK_EVENT_TYPES
    )) {
      const accepted = ['began', 'ended', 'occurred', 'bogus'].filter(
        (network_event_phase) =>
          is_valid_network_event_phase({
            network_event_type,
            network_event_phase
          })
      )
      expect(accepted, network_event_type).to.deep.equal(
        event_type.kind === 'condition' ? ['began', 'ended'] : ['occurred']
      )
    }
    expect(
      is_valid_network_event_phase({
        network_event_type: 'not_a_type',
        network_event_phase: 'began'
      })
    ).to.equal(false)
  })

  it('keeps operator-only types out of the public list', () => {
    expect(PUBLIC_NETWORK_EVENT_TYPES).to.not.include(
      'representative_rpc_control_enabled'
    )
    expect(PUBLIC_NETWORK_EVENT_TYPES).to.include(
      'representative_cemented_behind'
    )
  })

  it('resolves severity from the registry unless one is given', () => {
    expect(
      resolve_network_event_severity({
        network_event_type: 'representative_rpc_control_enabled'
      })
    ).to.equal('critical')
    expect(
      resolve_network_event_severity({
        network_event_type: 'representative_node_changed',
        severity: 'warning'
      })
    ).to.equal('warning')
  })
})

describe('representative alert rules', () => {
  it('computes the low-uptime share from counts', () => {
    expect(
      get_representative_uptime_share({ online_count: 2, total_count: 4 })
    ).to.equal(0.5)
    expect(
      is_representative_low_uptime({ online_count: 2, total_count: 4 })
    ).to.equal(true)
    expect(
      is_representative_low_uptime({ online_count: 3, total_count: 4 })
    ).to.equal(false)
    expect(
      is_representative_low_uptime({ online_count: 0, total_count: 0 })
    ).to.equal(false)
  })

  it('flags cemented behind above the threshold only', () => {
    expect(is_representative_cemented_behind(1001)).to.equal(true)
    expect(is_representative_cemented_behind(1000)).to.equal(false)
  })

  it('keeps the shared files free of node-only imports', async () => {
    for (const file of [
      'network-event-types.mjs',
      'representative-alert-rules.mjs'
    ]) {
      const source = await fs.readFile(
        path.resolve(__dirname, '../common', file),
        'utf8'
      )
      expect(source, file).to.not.match(/from 'node:|require\(/)
    }
  })
})
