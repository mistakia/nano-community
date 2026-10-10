/* global describe it beforeEach */
import chai from 'chai'
import { finalizeEvent, getPublicKey } from 'nostr-tools'
import { hexToBytes } from 'nostr-tools/utils'

import {
  build_board_announcement,
  build_task_issue,
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  build_vouch_set,
  build_block_set,
  build_account_attestation,
  build_deletion_request,
  build_key_properties,
  format_board_address
} from '#common/task-board/index.mjs'
import {
  create_relay_policy_state,
  seed_relay_policy_state,
  evaluate_relay_event
} from '#libs-server/task-board-relay-policy.mjs'

const expect = chai.expect

const make_key = (fill) => {
  const secret_key = hexToBytes(fill.repeat(64))
  return { secret_key, pubkey: getPublicKey(secret_key) }
}
const owner = make_key('1')
const member = make_key('2')
const stranger = make_key('3')
const board = { owner_pubkey: owner.pubkey, d_tag: 'nano-community-tasks' }
const sign = (key, template) => finalizeEvent(template, key.secret_key)
const NOW = 1760000040
const get_d = (event) => event.tags.find((tag) => tag[0] === 'd')[1]

describe('task board relay write policy', () => {
  let state
  const evaluate = (event, overrides = {}) =>
    evaluate_relay_event({
      state,
      event,
      source_type: 'IP4',
      source_info: '203.0.113.1',
      now: NOW,
      ...overrides
    })

  beforeEach(() => {
    state = create_relay_policy_state({
      boards: [board],
      rate_limits: { per_pubkey: 5, per_ip: 8 }
    })
  })

  it('accepts a board issue and its lifecycle events', () => {
    const issue = sign(member, build_task_issue({ board, subject: 'Task' }))
    expect(evaluate(issue).action).to.equal('accept')
    for (const template of [
      build_task_status({ board, issue, status: 'open' }),
      build_task_label({
        issue,
        namespace: 'community.nano.priority',
        value: 'high'
      }),
      build_task_claim({ board, issue }),
      build_task_comment({ issue, content: 'hi' })
    ]) {
      expect(
        evaluate(sign(member, template)).action,
        `kind ${template.kind}`
      ).to.equal('accept')
    }
  })

  it('rejects a kind-1 note', () => {
    const note = sign(member, {
      kind: 1,
      created_at: NOW,
      tags: [],
      content: 'gm'
    })
    expect(evaluate(note)).to.deep.equal({
      action: 'reject',
      msg: 'blocked: kind 1 is not accepted'
    })
  })

  it('rejects an issue for another board', () => {
    const other = sign(
      member,
      build_task_issue({ board: { ...board, d_tag: 'other' }, subject: 'x' })
    )
    expect(evaluate(other).action).to.equal('reject')
  })

  it('rejects a comment without a board-issue root', () => {
    const orphan = sign(
      member,
      build_task_comment({
        issue: { id: 'f'.repeat(64), pubkey: member.pubkey },
        content: 'x'
      })
    )
    expect(evaluate(orphan).action).to.equal('reject')
  })

  it('rejects a profile or deletion from an unknown pubkey', () => {
    const profile = sign(stranger, {
      kind: 0,
      created_at: NOW,
      tags: [],
      content: '{}'
    })
    expect(evaluate(profile).action).to.equal('reject')
    const deletion = sign(
      stranger,
      build_deletion_request({ events: [{ id: 'f'.repeat(64), kind: 1621 }] })
    )
    expect(evaluate(deletion).action).to.equal('reject')
  })

  it('accepts a profile once the pubkey has board activity', () => {
    seed_relay_policy_state(state, [
      sign(member, build_task_issue({ board, subject: 'Seeded' }))
    ])
    const profile = sign(member, {
      kind: 0,
      created_at: NOW,
      tags: [],
      content: '{}'
    })
    expect(evaluate(profile).action).to.equal('accept')
  })

  it('accepts key properties only when d and a name the board', () => {
    const relations = [{ role: 'acts_for', pubkey: member.pubkey }]
    const event = sign(stranger, build_key_properties({ board, relations }))
    expect(evaluate(event).action).to.equal('accept')

    const other = { owner_pubkey: owner.pubkey, d_tag: 'other' }
    const elsewhere = sign(
      stranger,
      build_key_properties({ board: other, relations })
    )
    expect(evaluate(elsewhere).msg).to.match(/must name the board/)

    const template = build_key_properties({ board, relations })
    template.tags = template.tags.filter((tag) => tag[0] !== 'a')
    expect(evaluate(sign(stranger, template)).msg).to.match(
      /must name the board/
    )
    expect(format_board_address(board)).to.equal(
      get_d(build_key_properties({ board }))
    )
  })

  it('accepts the board announcement only from its owner', () => {
    const template = build_board_announcement({ board, name: 'Board' })
    expect(evaluate(sign(owner, template)).action).to.equal('accept')
    expect(evaluate(sign(stranger, template)).action).to.equal('reject')
  })

  it('accepts vouch sets from stewards and step 1 keys only', () => {
    expect(
      evaluate(sign(member, build_vouch_set({ pubkeys: [] })))
    ).to.deep.equal({
      action: 'reject',
      msg: 'blocked: only stewards and keys a steward vouches for publish vouch sets'
    })
    expect(
      evaluate(sign(owner, build_vouch_set({ pubkeys: [member.pubkey] })))
        .action
    ).to.equal('accept')
    expect(
      evaluate(sign(member, build_vouch_set({ pubkeys: [stranger.pubkey] })))
        .action
    ).to.equal('accept')
    // A step 2 key posts but does not vouch.
    expect(
      evaluate(sign(stranger, build_vouch_set({ pubkeys: [] }))).action
    ).to.equal('reject')
    const other_set = sign(owner, {
      kind: 30000,
      created_at: NOW,
      tags: [['d', 'friends']],
      content: ''
    })
    expect(evaluate(other_set)).to.deep.equal({
      action: 'reject',
      msg: 'blocked: only the vouch and block follow sets are accepted'
    })
  })

  it('accepts a Nano account binding from a key with no board activity', () => {
    const proof = `1760054400:${'ab'.repeat(64)}`
    const account =
      'nano_3i1aq1cchnmbn9x5rsbap8b15akfh7wj7pwskuzi7ahz8oq6cobd99d4r3b7'
    const binding = (tags) =>
      sign(stranger, { kind: 10011, created_at: NOW, tags, content: '' })
    expect(
      evaluate(binding([['i', `nano:${account}`, proof]])).action
    ).to.equal('accept')
    expect(evaluate(binding([['i', 'github:someone', 'gist']]))).to.deep.equal({
      action: 'reject',
      msg: 'blocked: a Nano account binding needs exactly one nano: i tag with a proof'
    })
    expect(
      evaluate(
        binding([
          ['i', `nano:${account}`, proof],
          ['i', `nano:${account}`, proof]
        ])
      ).action
    ).to.equal('reject')
  })

  it('takes account attestations from stewards, and counts them toward step 2', () => {
    state.rate_limits = {
      per_pubkey: 100,
      per_ip: 100,
      untrusted_issues_per_day: 1
    }
    const attestation = build_account_attestation({
      pubkey: stranger.pubkey,
      value: 'established',
      created_at: NOW
    })
    expect(evaluate(sign(member, attestation))).to.deep.equal({
      action: 'reject',
      msg: 'blocked: only stewards attest Nano accounts'
    })
    const file = (subject) =>
      evaluate(sign(stranger, build_task_issue({ board, subject }))).action
    evaluate(sign(owner, build_vouch_set({ pubkeys: [member.pubkey] })))
    evaluate(sign(member, build_vouch_set({ pubkeys: [stranger.pubkey] })))
    expect(file('One vouch')).to.equal('accept')
    expect(file('One vouch, over the daily limit')).to.equal('reject')
    expect(evaluate(sign(owner, attestation)).action).to.equal('accept')
    expect(file('One vouch and an established account')).to.equal('accept')
  })

  it('accepts block sets from stewards only, and a block voids vouches', () => {
    evaluate(sign(owner, build_vouch_set({ pubkeys: [member.pubkey] })))
    expect(
      evaluate(sign(member, build_block_set({ pubkeys: [stranger.pubkey] })))
    ).to.deep.equal({
      action: 'reject',
      msg: 'blocked: only stewards publish block sets'
    })
    expect(
      evaluate(sign(owner, build_block_set({ pubkeys: [member.pubkey] })))
        .action
    ).to.equal('accept')
    expect(
      evaluate(sign(member, build_vouch_set({ pubkeys: [] }))).action
    ).to.equal('reject')
  })

  it('treats the maintainers of the latest announcement as stewards', () => {
    const steward = make_key('7')
    evaluate(
      sign(owner, {
        ...build_board_announcement({
          board,
          name: 'Board',
          maintainers: [steward.pubkey]
        }),
        created_at: NOW - 10
      })
    )
    expect(
      evaluate(sign(steward, build_vouch_set({ pubkeys: [] }))).action
    ).to.equal('accept')
    evaluate(
      sign(owner, {
        ...build_board_announcement({ board, name: 'Board' }),
        created_at: NOW - 5
      })
    )
    expect(
      evaluate(sign(steward, build_vouch_set({ pubkeys: [] }))).action
    ).to.equal('reject')
  })

  it('exempts stewards from the per-pubkey limit', () => {
    const results = Array.from(
      { length: 7 },
      (_, i) =>
        evaluate(sign(owner, build_task_issue({ board, subject: `T${i}` })))
          .action
    )
    expect(results.every((a) => a === 'accept')).to.equal(true)
  })

  it('caps issues a day from keys outside the web of trust', () => {
    state.rate_limits = {
      per_pubkey: 100,
      per_ip: 100,
      untrusted_issues_per_day: 2
    }
    const file = (key, now = NOW) =>
      evaluate(sign(key, build_task_issue({ board, subject: `T${now}` })), {
        now
      })
    expect(file(stranger).action).to.equal('accept')
    expect(file(stranger, NOW + 1).action).to.equal('accept')
    expect(file(stranger, NOW + 2)).to.deep.equal({
      action: 'reject',
      msg: 'rate-limited: daily issue limit for keys outside the web of trust'
    })
    expect(file(stranger, NOW + 86400).action).to.equal('accept')

    evaluate(sign(owner, build_vouch_set({ pubkeys: [member.pubkey] })))
    for (let i = 0; i < 4; i++) {
      expect(file(member, NOW + 10 + i).action).to.equal('accept')
    }

    // Step 2: two step 1 vouchers lift the cap.
    const second = make_key('9')
    const newcomer = make_key('a')
    evaluate(
      sign(owner, {
        ...build_vouch_set({ pubkeys: [member.pubkey, second.pubkey] }),
        created_at: Math.floor(Date.now() / 1000) + 1
      })
    )
    evaluate(sign(member, build_vouch_set({ pubkeys: [newcomer.pubkey] })))
    expect(file(newcomer, NOW + 30).action).to.equal('accept')
    expect(file(newcomer, NOW + 31).action).to.equal('accept')
    expect(file(newcomer, NOW + 32).action).to.equal('reject')
    evaluate(sign(second, build_vouch_set({ pubkeys: [newcomer.pubkey] })))
    expect(file(newcomer, NOW + 33).action).to.equal('accept')
  })

  it('rejects the first issue in a window when the limit is 0', () => {
    state.rate_limits = {
      per_pubkey: 100,
      per_ip: 100,
      untrusted_issues_per_day: 0
    }
    expect(
      evaluate(sign(stranger, build_task_issue({ board, subject: 'First' })))
    ).to.deep.equal({
      action: 'reject',
      msg: 'rate-limited: daily issue limit for keys outside the web of trust'
    })
  })

  it('derives stewards and trust from seeded events in any order', () => {
    const steward = make_key('8')
    const announcement = sign(
      owner,
      build_board_announcement({
        board,
        name: 'B',
        maintainers: [steward.pubkey]
      })
    )
    const triage = sign(steward, build_vouch_set({ pubkeys: [member.pubkey] }))
    seed_relay_policy_state(state, [triage, announcement])
    state.rate_limits = {
      per_pubkey: 100,
      per_ip: 100,
      untrusted_issues_per_day: 0
    }
    expect(
      evaluate(sign(member, build_task_issue({ board, subject: 'Trusted' })))
        .action
    ).to.equal('accept')
  })

  it('rate-limits a burst from one pubkey', () => {
    const results = Array.from(
      { length: 7 },
      (_, i) =>
        evaluate(
          sign(member, build_task_issue({ board, subject: `Task ${i}` }))
        ).action
    )
    expect(results.filter((a) => a === 'accept')).to.have.length(5)
    expect(results.slice(5)).to.deep.equal(['reject', 'reject'])
  })

  it('rate-limits a burst from one IP across pubkeys', () => {
    const keys = ['4', '5', '6'].map(make_key)
    const results = Array.from(
      { length: 9 },
      (_, i) =>
        evaluate(
          sign(keys[i % 3], build_task_issue({ board, subject: `T${i}` }))
        ).action
    )
    expect(results.filter((a) => a === 'accept')).to.have.length(8)
  })

  it('does not rate-limit operator imports and sync', () => {
    const results = Array.from(
      { length: 10 },
      (_, i) =>
        evaluate(sign(member, build_task_issue({ board, subject: `T${i}` })), {
          source_type: 'Sync'
        }).action
    )
    expect(results.every((a) => a === 'accept')).to.equal(true)
  })

  it('resets the limit in the next window', () => {
    for (let i = 0; i < 5; i++) {
      evaluate(sign(member, build_task_issue({ board, subject: `T${i}` })))
    }
    const later = evaluate(
      sign(member, build_task_issue({ board, subject: 'Later' })),
      {
        now: NOW + 60
      }
    )
    expect(later.action).to.equal('accept')
  })
})
