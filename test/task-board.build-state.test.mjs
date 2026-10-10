/* global describe it */
import chai from 'chai'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { finalizeEvent, getPublicKey, verifyEvent } from 'nostr-tools'
import { hexToBytes } from 'nostr-tools/utils'

import {
  build_board_announcement,
  build_task_issue,
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  build_triage_set,
  build_deletion_request,
  build_task_board_state
} from '#common/task-board/index.mjs'

const expect = chai.expect
const __dirname = dirname(fileURLToPath(import.meta.url))

const make_key = (fill) => {
  const secret_key = hexToBytes(fill.repeat(64))
  return { secret_key, pubkey: getPublicKey(secret_key) }
}
const owner = make_key('1')
const steward = make_key('2')
const contributor = make_key('3')
const stranger = make_key('4')
const new_steward = make_key('5')

const board = { owner_pubkey: owner.pubkey, d_tag: 'nano-community-tasks' }
const sign = (key, template) => finalizeEvent(template, key.secret_key)
const T = 1760000000
const now = T + 1000

const announce = ({ maintainers, created_at = T }) =>
  sign(
    owner,
    build_board_announcement({ board, name: 'Board', maintainers, created_at })
  )
const issue_by = (key, subject, created_at = T + 1) =>
  sign(key, build_task_issue({ board, subject, created_at }))
const label = (key, issue, namespace, value, created_at) =>
  sign(key, build_task_label({ issue, namespace, value, created_at }))
const PRIORITY = 'community.nano.priority'
const STATE = 'community.nano.state'

const state_of = (events) => build_task_board_state({ events, board, now })

describe('task board view reducer', () => {
  const announcement = announce({ maintainers: [steward.pubkey] })

  it('treats the owner and announced maintainers as stewards', () => {
    const state = state_of([announcement])
    expect(state.stewards).to.have.members([owner.pubkey, steward.pubkey])
  })

  it('lets a newer announcement change the steward set', () => {
    const newer = announce({
      maintainers: [new_steward.pubkey],
      created_at: T + 50
    })
    const state = state_of([announcement, newer])
    expect(state.stewards).to.have.members([owner.pubkey, new_steward.pubkey])
  })

  it('ignores an announcement signed by anyone but the owner', () => {
    const forged = sign(
      stranger,
      build_board_announcement({
        board,
        name: 'Forged',
        maintainers: [stranger.pubkey],
        created_at: T + 99
      })
    )
    const state = state_of([announcement, forged])
    expect(state.stewards).to.not.include(stranger.pubkey)
  })

  it('places an unlabelled steward issue in triage', () => {
    const issue = issue_by(steward, 'Unlabelled')
    const state = state_of([announcement, issue])
    expect(state.columns.triage).to.deep.equal([issue.id])
    expect(state.tasks[issue.id].status).to.equal('open')
  })

  it('ignores a non-steward status and label', () => {
    const issue = issue_by(steward, 'Task')
    const events = [
      announcement,
      issue,
      label(steward, issue, PRIORITY, 'high', T + 2),
      sign(
        stranger,
        build_task_status({ board, issue, status: 'closed', created_at: T + 3 })
      ),
      label(stranger, issue, PRIORITY, 'low', T + 4),
      label(stranger, issue, STATE, 'blocked', T + 4)
    ]
    const task = state_of(events).tasks[issue.id]
    expect(task.status).to.equal('open')
    expect(task.priority).to.equal('high')
    expect(task.state).to.equal(null)
    expect(task.column).to.equal('needs_taker')
  })

  it('honours a status from the issue author', () => {
    const issue = issue_by(contributor, 'Mine')
    const status = sign(
      contributor,
      build_task_status({ board, issue, status: 'resolved', created_at: T + 2 })
    )
    const task = state_of([announcement, issue, status]).tasks[issue.id]
    expect(task.status).to.equal('resolved')
    expect(task.column).to.equal('closed')
  })

  it('takes the latest steward status', () => {
    const issue = issue_by(steward, 'Task')
    const events = [
      announcement,
      issue,
      sign(
        steward,
        build_task_status({ board, issue, status: 'draft', created_at: T + 2 })
      ),
      sign(
        owner,
        build_task_status({ board, issue, status: 'open', created_at: T + 3 })
      )
    ]
    expect(state_of(events).tasks[issue.id].status).to.equal('open')
  })

  it('lets a newer label supersede an older one, ties going to the lowest id', () => {
    const issue = issue_by(steward, 'Task')
    const older = label(steward, issue, PRIORITY, 'low', T + 2)
    const newer = label(steward, issue, PRIORITY, 'critical', T + 3)
    expect(
      state_of([announcement, issue, older, newer]).tasks[issue.id].priority
    ).to.equal('critical')

    const tie_a = label(steward, issue, PRIORITY, 'medium', T + 5)
    const tie_b = label(owner, issue, PRIORITY, 'high', T + 5)
    const winner = tie_a.id < tie_b.id ? 'medium' : 'high'
    expect(
      state_of([announcement, issue, tie_b, tie_a]).tasks[issue.id].priority
    ).to.equal(winner)
  })

  it('keeps priority and state namespaces independent', () => {
    const issue = issue_by(steward, 'Task')
    const events = [
      announcement,
      issue,
      label(steward, issue, PRIORITY, 'high', T + 2),
      label(steward, issue, STATE, 'blocked', T + 3)
    ]
    const task = state_of(events).tasks[issue.id]
    expect(task.priority).to.equal('high')
    expect(task.state).to.equal('blocked')
    expect(task.column).to.equal('blocked')
  })

  it('moves an actively claimed task to in progress', () => {
    const issue = issue_by(steward, 'Task')
    const claim = sign(
      stranger,
      build_task_claim({ board, issue, created_at: T + 2 })
    )
    const state = state_of([
      announcement,
      issue,
      label(steward, issue, PRIORITY, 'high', T + 2),
      claim
    ])
    expect(state.columns.in_progress).to.deep.equal([issue.id])
    expect(state.tasks[issue.id].active_claimants).to.deep.equal([
      stranger.pubkey
    ])
  })

  it('returns an expired or released claim to needs a taker', () => {
    const issue = issue_by(steward, 'Task')
    const prioritized = label(steward, issue, PRIORITY, 'high', T + 2)
    const expired = sign(
      contributor,
      build_task_claim({ board, issue, created_at: T + 2, expiration: now - 1 })
    )
    const claimed = sign(
      stranger,
      build_task_claim({ board, issue, created_at: T + 2 })
    )
    const released = sign(
      stranger,
      build_task_claim({ board, issue, status: 'released', created_at: T + 3 })
    )
    const state = state_of([
      announcement,
      issue,
      prioritized,
      expired,
      claimed,
      released
    ])
    expect(state.columns.needs_taker).to.deep.equal([issue.id])
    expect(state.tasks[issue.id].claims).to.have.length(2)
  })

  it('caps a claim at the claim lifetime after signing', () => {
    const issue = issue_by(steward, 'Task')
    const lifetime = 30 * 24 * 60 * 60
    const unbounded = build_task_claim({ board, issue, created_at: T + 2 })
    unbounded.tags = unbounded.tags.filter((tag) => tag[0] !== 'expiration')
    const far = build_task_claim({
      board,
      issue,
      created_at: T + 2,
      expiration: T + 10 * lifetime
    })
    const events = [
      announcement,
      issue,
      sign(contributor, unbounded),
      sign(stranger, far)
    ]
    const live = state_of(events).tasks[issue.id]
    expect(live.active_claimants).to.have.length(2)
    for (const claim of live.claims) {
      expect(claim.expiration).to.equal(T + 2 + lifetime)
    }
    const later = build_task_board_state({
      events,
      board,
      now: T + 2 + lifetime + 1
    })
    expect(later.tasks[issue.id].active_claimants).to.deep.equal([])
  })

  it('hides an issue from outside the steward and trusted sets', () => {
    const issue = issue_by(stranger, 'Spam')
    const state = state_of([announcement, issue])
    expect(state.tasks[issue.id].is_hidden).to.equal(true)
    for (const ids of Object.values(state.columns))
      expect(ids).to.not.include(issue.id)
  })

  it('shows a trusted contributor issue once a steward follows them', () => {
    const issue = issue_by(contributor, 'Contribution')
    const triage = sign(
      steward,
      build_triage_set({ pubkeys: [contributor.pubkey], created_at: T + 2 })
    )
    const stranger_set = sign(
      stranger,
      build_triage_set({ pubkeys: [stranger.pubkey], created_at: T + 2 })
    )
    const state = state_of([announcement, issue, triage, stranger_set])
    expect(state.trusted).to.deep.equal([contributor.pubkey])
    expect(state.columns.triage).to.deep.equal([issue.id])
  })

  it('places a draft status in the draft column', () => {
    const issue = issue_by(steward, 'Task')
    const draft = sign(
      steward,
      build_task_status({ board, issue, status: 'draft', created_at: T + 2 })
    )
    expect(state_of([announcement, issue, draft]).columns.draft).to.deep.equal([
      issue.id
    ])
  })

  it('drops events the author asked to delete', () => {
    const issue = issue_by(steward, 'Task')
    const forged_delete = sign(
      stranger,
      build_deletion_request({ events: [issue], created_at: T + 2 })
    )
    expect(state_of([announcement, issue, forged_delete]).tasks).to.have.key(
      issue.id
    )
    const delete_request = sign(
      steward,
      build_deletion_request({ events: [issue], created_at: T + 2 })
    )
    expect(state_of([announcement, issue, delete_request]).tasks).to.deep.equal(
      {}
    )
  })

  it('ignores issues addressed to another board', () => {
    const other = sign(
      steward,
      build_task_issue({
        board: { ...board, d_tag: 'other' },
        subject: 'x',
        created_at: T
      })
    )
    expect(state_of([announcement, other]).tasks).to.deep.equal({})
  })

  it('sorts by priority, then latest activity', () => {
    const low = issue_by(steward, 'Low', T + 1)
    const high_old = issue_by(steward, 'High old', T + 2)
    const high_new = issue_by(steward, 'High new', T + 3)
    const events = [
      announcement,
      low,
      high_old,
      high_new,
      label(steward, low, PRIORITY, 'low', T + 10),
      label(steward, high_old, PRIORITY, 'high', T + 4),
      label(steward, high_new, PRIORITY, 'high', T + 5),
      sign(
        contributor,
        build_task_comment({
          issue: high_old,
          content: 'bump',
          created_at: T + 20
        })
      )
    ]
    const state = state_of(events)
    expect(state.columns.needs_taker).to.deep.equal([
      high_old.id,
      high_new.id,
      low.id
    ])
    expect(state.tasks[high_old.id].comment_count).to.equal(1)
  })
})

describe('task board protocol spec examples', () => {
  const spec_path = path.resolve(
    __dirname,
    '../docs/design/task-board-protocol.md'
  )
  const spec = fs.readFileSync(spec_path, 'utf8')
  const examples = [...spec.matchAll(/```json\n([\s\S]*?)```/g)].map((m) =>
    JSON.parse(m[1])
  )

  it('has a worked example for each kind', () => {
    const kinds = new Set(examples.map((e) => e.kind))
    for (const kind of [
      5, 1111, 1621, 1630, 1631, 1632, 1633, 1985, 30000, 30617, 30634
    ]) {
      expect(kinds, `kind ${kind}`).to.include(kind)
    }
  })

  it('every example event verifies', () => {
    for (const event of examples) {
      expect(verifyEvent(event), `kind ${event.kind} ${event.id}`).to.equal(
        true
      )
    }
  })

  it('the examples reduce to the documented board', () => {
    const announcement = examples.find((e) => e.kind === 30617)
    const state = build_task_board_state({
      events: examples,
      board: {
        owner_pubkey: announcement.pubkey,
        d_tag: 'nano-community-tasks'
      },
      now: announcement.created_at + 3600
    })
    const subjects = (column) =>
      state.columns[column].map((id) => state.tasks[id].subject)
    expect(subjects('in_progress')).to.deep.equal([
      'Document representative uptime scoring'
    ])
    expect(subjects('draft')).to.deep.equal([
      'Add a dark-mode toggle to the board'
    ])
    expect(subjects('closed')).to.deep.equal(['New title'])
    expect(Object.values(state.tasks).map((t) => t.subject)).to.not.include(
      'Old title'
    )
  })
})
