/* global describe it */
import chai from 'chai'

import resolve_telemetry_account from '#libs-server/resolve-telemetry-account.mjs'

const expect = chai.expect

const rep_a = { account: 'nano_rep_a', ip: '[::ffff:1.1.1.1]:7075', weight: 10 }
const rep_b = { account: 'nano_rep_b', ip: '[::ffff:2.2.2.2]:7075', weight: 20 }
const rep_peers = { [rep_a.account]: rep_a, [rep_b.account]: rep_b }

const interface_at = (address, port = '7075') => ({ address, port })

describe('resolve_telemetry_account', () => {
  it('attributes a node whose interface the rep crawler sees', () => {
    const result = resolve_telemetry_account({
      node_id: 'node_1',
      node_interfaces: [interface_at('::ffff:1.1.1.1')],
      rep_peers,
      history_account_by_node_id: new Map(),
      live_node_ids: new Set(['node_1'])
    })
    expect(result.source).to.equal('rep_crawler')
    expect(result.rep).to.equal(rep_a)
  })

  it('matches the crawler on any interface of a multi-interface node', () => {
    const result = resolve_telemetry_account({
      node_id: 'node_1',
      node_interfaces: [
        interface_at('::ffff:9.9.9.9'),
        interface_at('::ffff:2.2.2.2')
      ],
      rep_peers,
      history_account_by_node_id: new Map(),
      live_node_ids: new Set(['node_1'])
    })
    expect(result.rep).to.equal(rep_b)
  })

  it('falls back to the account last attributed to the node_id', () => {
    const result = resolve_telemetry_account({
      node_id: 'node_behind_proxy',
      node_interfaces: [interface_at('::ffff:9.9.9.9')],
      rep_peers,
      history_account_by_node_id: new Map([
        ['node_behind_proxy', 'nano_rep_b']
      ]),
      live_node_ids: new Set(['node_behind_proxy'])
    })
    expect(result.source).to.equal('telemetry_history')
    expect(result.rep).to.equal(rep_b)
  })

  it('rejects a crawler match when the account votes from another live node', () => {
    // rep_a's channel is a proxy at 1.1.1.1; its real node is node_real
    const result = resolve_telemetry_account({
      node_id: 'node_proxy',
      node_interfaces: [interface_at('::ffff:1.1.1.1')],
      rep_peers,
      history_account_by_node_id: new Map([['node_real', 'nano_rep_a']]),
      live_node_ids: new Set(['node_proxy', 'node_real'])
    })
    expect(result.source).to.equal('unknown')
    expect(result.rep).to.equal(null)
  })

  it('keeps a crawler match when the account history node is offline', () => {
    const result = resolve_telemetry_account({
      node_id: 'node_new',
      node_interfaces: [interface_at('::ffff:1.1.1.1')],
      rep_peers,
      history_account_by_node_id: new Map([['node_old', 'nano_rep_a']]),
      live_node_ids: new Set(['node_new'])
    })
    expect(result.source).to.equal('rep_crawler')
    expect(result.rep).to.equal(rep_a)
  })

  it('leaves a node unattributed when its history account is not online', () => {
    const result = resolve_telemetry_account({
      node_id: 'node_1',
      node_interfaces: [interface_at('::ffff:9.9.9.9')],
      rep_peers,
      history_account_by_node_id: new Map([['node_1', 'nano_rep_offline']]),
      live_node_ids: new Set(['node_1'])
    })
    expect(result.source).to.equal('unknown')
    expect(result.rep).to.equal(null)
  })
})
