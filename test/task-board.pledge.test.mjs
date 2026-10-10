/* global describe it */
import chai from 'chai'
import fs from 'fs'
import { finalizeEvent, getPublicKey } from 'nostr-tools'
import { hexToBytes } from 'nostr-tools/utils'
import {
  encode_signed_message,
  sign_message,
  verify_signed_message
} from 'nano-signed-message'

import {
  build_board_announcement,
  build_task_issue,
  build_task_label,
  build_task_pledge,
  build_pledge_payload,
  build_pledge_attestation,
  parse_task_pledge,
  build_task_board_state,
  TASK_PLEDGE_PROMOTION_RAW
} from '#common/task-board/index.mjs'

const expect = chai.expect

const vectors = JSON.parse(
  fs.readFileSync(
    new URL(
      '../node_modules/nano-signed-message/test-vectors/positive.json',
      import.meta.url
    ),
    'utf8'
  )
).vectors
const VECTOR = vectors.find(
  (vector) => vector.description === 'nostr pledge, direct mode'
)

const make_key = (fill) => {
  const secret_key = hexToBytes(fill.repeat(64))
  return { secret_key, pubkey: getPublicKey(secret_key) }
}
const owner = make_key('1')
const steward = make_key('2')
const backer = make_key('3')
const other_backer = make_key('4')
const board = { owner_pubkey: owner.pubkey, d_tag: 'nano-community-tasks' }
const sign = (key, template) => finalizeEvent(template, key.secret_key)
const T = 1760000000
const now = T + 1000
const XNO = 10n ** 30n
const ACCOUNT = VECTOR.account

const pledge_by = (key, issue, amount_raw, created_at = T + 2, payout) =>
  sign(
    key,
    build_task_pledge({
      board,
      issue_id: issue.id,
      account: ACCOUNT,
      amount_raw: String(amount_raw),
      issued_at: T,
      signature: 'ab'.repeat(64),
      payout,
      created_at
    })
  )
const verdict = (pledge_event, value, created_at = T + 3) =>
  sign(steward, build_pledge_attestation({ pledge_event, value, created_at }))

describe('task board pledges', () => {
  const announcement = sign(
    owner,
    build_board_announcement({
      board,
      name: 'Board',
      maintainers: [steward.pubkey],
      created_at: T
    })
  )
  const issue = sign(
    steward,
    build_task_issue({ board, subject: 'Bounty task', created_at: T + 1 })
  )
  const task_of = (...events) =>
    build_task_board_state({
      events: [announcement, issue, ...events],
      board,
      now
    }).tasks[issue.id]

  it('builds the payload the library pledge vector signs', () => {
    const payload = build_pledge_payload({
      account: VECTOR.account,
      issued_at: VECTOR.payload.issued_at,
      ...VECTOR.payload.parameters
    })
    expect(encode_signed_message(payload)).to.equal(VECTOR.message)
  })

  it('round-trips a pledge event whose proof verifies', () => {
    const { parameters, issued_at } = VECTOR.payload
    const { signature } = sign_message({
      payload: build_pledge_payload({
        account: VECTOR.account,
        issued_at,
        ...parameters
      }),
      private_key: VECTOR.private_key
    })
    const event = build_task_pledge({
      board,
      issue_id: parameters.issue_event_id,
      account: VECTOR.account,
      amount_raw: parameters.amount_raw,
      issued_at,
      signature
    })
    const pledge = parse_task_pledge(event)
    const message = encode_signed_message(
      build_pledge_payload({
        account: pledge.account,
        issue_event_id: pledge.issue_id,
        amount_raw: pledge.amount_raw,
        nostr_public_key: parameters.nostr_public_key,
        issued_at: pledge.issued_at
      })
    )
    const result = verify_signed_message({
      message,
      signature: pledge.signature,
      domain: 'nostr',
      actions: ['pledge'],
      now: pledge.issued_at
    })
    expect(result.payload.parameters.amount_raw).to.equal(parameters.amount_raw)
  })

  it('rejects a malformed pledge', () => {
    const good = pledge_by(backer, issue, XNO)
    const with_tags = (tags) => ({ ...good, tags })
    expect(parse_task_pledge(good)).to.not.equal(null)
    expect(
      parse_task_pledge(with_tags([...good.tags, ['nano_account', ACCOUNT]]))
    ).to.equal(null)
    expect(
      parse_task_pledge(
        with_tags(
          good.tags.map((t) => (t[0] === 'amount' ? ['amount', '01'] : t))
        )
      )
    ).to.equal(null)
    expect(
      parse_task_pledge(with_tags([...good.tags, ['payout', 'xyz']]))
    ).to.equal(null)
  })

  it('counts only backed pledges and promotes a task out of Triage at the threshold', () => {
    const half = BigInt(TASK_PLEDGE_PROMOTION_RAW) / 2n
    const first = pledge_by(backer, issue, half)
    const second = pledge_by(other_backer, issue, half)
    expect(task_of(first, second).column).to.equal('triage')
    expect(task_of(first, second).pledges.map((p) => p.verdict)).to.deep.equal([
      'pending',
      'pending'
    ])

    const one_backed = task_of(first, second, verdict(first, 'backed'))
    expect(one_backed.pledged_raw).to.equal(half.toString())
    expect(one_backed.column).to.equal('triage')

    const unbacked = task_of(
      first,
      second,
      verdict(first, 'backed'),
      verdict(second, 'unbacked')
    )
    expect(unbacked.pledged_raw).to.equal(half.toString())

    const both = task_of(
      first,
      second,
      verdict(first, 'backed'),
      verdict(second, 'backed')
    )
    expect(both.pledged_raw).to.equal(TASK_PLEDGE_PROMOTION_RAW)
    expect(both.column).to.equal('needs_taker')
  })

  it('lets a steward state still win over pledges', () => {
    const pledge = pledge_by(backer, issue, TASK_PLEDGE_PROMOTION_RAW)
    const blocked = sign(
      steward,
      build_task_label({
        issue,
        namespace: 'community.nano.state',
        value: 'blocked',
        created_at: T + 4
      })
    )
    expect(task_of(pledge, verdict(pledge, 'backed'), blocked).column).to.equal(
      'blocked'
    )
  })

  it('waits for a new verdict when a pledge is replaced, and lets backed lapse', () => {
    const pledge = pledge_by(backer, issue, TASK_PLEDGE_PROMOTION_RAW)
    const raised = pledge_by(backer, issue, 100n * XNO, T + 5)
    const task = task_of(pledge, verdict(pledge, 'backed'), raised)
    expect(task.pledges).to.have.length(1)
    expect(task.pledges[0].verdict).to.equal('pending')
    expect(task.column).to.equal('triage')

    const lapsed = build_task_board_state({
      events: [announcement, issue, pledge, verdict(pledge, 'backed')],
      board,
      now: T + 3 + 8 * 24 * 60 * 60
    }).tasks[issue.id]
    expect(lapsed.pledges[0].verdict).to.equal('pending')
  })

  it('sums paid pledges, which do not lapse', () => {
    const paid = pledge_by(backer, issue, 5n * XNO, T + 2, 'AB'.repeat(32))
    const task = build_task_board_state({
      events: [announcement, issue, paid, verdict(paid, 'paid')],
      board,
      now: T + 100 * 24 * 60 * 60
    }).tasks[issue.id]
    expect(task.paid_raw).to.equal((5n * XNO).toString())
    expect(task.pledged_raw).to.equal('0')
  })

  it('ignores verdicts from keys that are not stewards', () => {
    const pledge = pledge_by(backer, issue, TASK_PLEDGE_PROMOTION_RAW)
    const forged = sign(
      backer,
      build_pledge_attestation({
        pledge_event: pledge,
        value: 'backed',
        created_at: T + 3
      })
    )
    expect(task_of(pledge, forged).pledges[0].verdict).to.equal('pending')
  })
})
