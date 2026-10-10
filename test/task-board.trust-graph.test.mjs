/* global describe it */
import chai from 'chai'

import {
  build_trust_graph,
  select_trust_sets,
  is_voucher,
  VOUCH_SET_D_TAG,
  BLOCK_SET_D_TAG
} from '#common/task-board/index.mjs'

const expect = chai.expect

const key = (fill) => fill.repeat(64)
const STEWARD = key('a')
const OTHER_STEWARD = key('b')
const ALICE = key('1')
const BOB = key('2')
const CAROL = key('3')
const DAVE = key('4')

let next_id = 0
const set_event = (d_tag, author, pubkeys, created_at = 100) => ({
  id: String(next_id++).padStart(64, '0'),
  kind: 30000,
  pubkey: author,
  created_at,
  tags: [['d', d_tag], ...pubkeys.map((p) => ['p', p])],
  content: ''
})
const vouch = (author, pubkeys, created_at) =>
  set_event(VOUCH_SET_D_TAG, author, pubkeys, created_at)
const block = (author, pubkeys, created_at) =>
  set_event(BLOCK_SET_D_TAG, author, pubkeys, created_at)

const graph_of = (events, established = new Set()) => {
  const stewards = new Set([STEWARD, OTHER_STEWARD])
  const graph = build_trust_graph({
    stewards,
    established,
    ...select_trust_sets(events)
  })
  return { ...graph, stewards }
}

describe('task board web of trust', () => {
  it('puts a key one steward vouches for at step 1', () => {
    const { trusted } = graph_of([vouch(STEWARD, [ALICE])])
    expect(trusted.get(ALICE)).to.deep.equal({ step: 1, vouchers: [STEWARD] })
  })

  it('needs two step 1 vouchers for step 2', () => {
    const one = graph_of([vouch(STEWARD, [ALICE, BOB]), vouch(ALICE, [CAROL])])
    expect(one.trusted.has(CAROL)).to.equal(false)
    const two = graph_of([
      vouch(STEWARD, [ALICE, BOB]),
      vouch(ALICE, [CAROL]),
      vouch(BOB, [CAROL])
    ])
    expect(two.trusted.get(CAROL)).to.deep.equal({
      step: 2,
      vouchers: [ALICE, BOB].sort()
    })
  })

  it('takes one step 1 voucher and an established Nano account for step 2', () => {
    const { trusted } = graph_of(
      [vouch(STEWARD, [ALICE]), vouch(ALICE, [CAROL])],
      new Set([CAROL])
    )
    expect(trusted.get(CAROL).step).to.equal(2)
  })

  it('never makes an established account trusted on its own', () => {
    const { trusted } = graph_of([], new Set([CAROL]))
    expect(trusted.has(CAROL)).to.equal(false)
  })

  it('does not extend trust past step 2', () => {
    const graph = graph_of(
      [vouch(STEWARD, [ALICE]), vouch(ALICE, [CAROL]), vouch(CAROL, [DAVE])],
      new Set([CAROL, DAVE])
    )
    expect(graph.trusted.get(CAROL).step).to.equal(2)
    expect(graph.trusted.has(DAVE)).to.equal(false)
    expect(is_voucher(graph, ALICE)).to.equal(true)
    expect(is_voucher(graph, CAROL)).to.equal(false)
  })

  it('lets a steward block void a key and its vouches', () => {
    const { trusted, blocked } = graph_of(
      [
        vouch(STEWARD, [ALICE]),
        vouch(ALICE, [CAROL]),
        block(OTHER_STEWARD, [ALICE])
      ],
      new Set([CAROL])
    )
    expect(trusted.has(ALICE)).to.equal(false)
    expect(trusted.has(CAROL)).to.equal(false)
    expect([...blocked]).to.deep.equal([ALICE])
  })

  it('ignores block sets from non-stewards and blocks of stewards', () => {
    const { trusted, blocked } = graph_of([
      vouch(STEWARD, [ALICE]),
      block(ALICE, [BOB]),
      block(STEWARD, [OTHER_STEWARD])
    ])
    expect(trusted.has(ALICE)).to.equal(true)
    expect(blocked.size).to.equal(0)
  })

  it('reads only the latest set per key, and ignores self-vouches', () => {
    const { trusted } = graph_of([
      vouch(STEWARD, [ALICE], 100),
      vouch(STEWARD, [BOB, STEWARD], 200)
    ])
    expect([...trusted.keys()]).to.deep.equal([BOB])
  })

  it('drops a voucher that loses its own vouch, with its vouches', () => {
    const { trusted } = graph_of(
      [
        vouch(STEWARD, [], 200),
        vouch(STEWARD, [ALICE], 100),
        vouch(ALICE, [CAROL])
      ],
      new Set([CAROL])
    )
    expect(trusted.size).to.equal(0)
  })
})
