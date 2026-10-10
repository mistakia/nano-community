/* global describe it */
import chai from 'chai'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  finalizeEvent,
  getEventHash,
  getPublicKey,
  verifyEvent
} from 'nostr-tools'
import { hexToBytes } from 'nostr-tools/utils'

import {
  build_board_announcement,
  build_task_issue,
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  build_vouch_set,
  build_account_attestation,
  build_deletion_request,
  build_key_properties,
  edit_key_relation,
  build_task_board_state,
  get_event_pow,
  TASK_UNVOUCHED_POW_DIFFICULTY
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
// Mines at the event's own created_at, unlike minePow, so test times hold.
const mined = (key, template) => {
  const event = { ...template, pubkey: key.pubkey }
  const nonce = ['nonce', '0', String(TASK_UNVOUCHED_POW_DIFFICULTY)]
  event.tags = [...event.tags, nonce]
  for (let n = 0; ; n++) {
    nonce[1] = String(n)
    event.id = getEventHash(event)
    if (get_event_pow(event) >= TASK_UNVOUCHED_POW_DIFFICULTY)
      return sign(key, event)
  }
}
const mined_issue_by = (key, subject, created_at = T + 1) =>
  mined(key, build_task_issue({ board, subject, created_at }))
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
    const issue = mined_issue_by(contributor, 'Mine')
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
    const issue = mined_issue_by(stranger, 'Spam')
    const state = state_of([announcement, issue])
    expect(state.tasks[issue.id].is_hidden).to.equal(true)
    for (const ids of Object.values(state.columns))
      expect(ids).to.not.include(issue.id)
  })

  it('drops an unmined issue and comment from a key with no standing until it is vouched for', () => {
    const issue = issue_by(stranger, 'Unmined')
    expect(state_of([announcement, issue]).tasks[issue.id]).to.equal(undefined)

    const own = mined_issue_by(stranger, 'Mined')
    const comment = () =>
      build_task_comment({ issue: own, content: 'More', created_at: T + 2 })
    const unmined = sign(stranger, comment())
    const with_pow = mined(stranger, comment())
    expect(
      state_of([announcement, own, unmined]).tasks[own.id].comment_count
    ).to.equal(0)
    expect(
      state_of([announcement, own, with_pow]).tasks[own.id].comment_count
    ).to.equal(1)

    const vouch = sign(
      steward,
      build_vouch_set({ pubkeys: [stranger.pubkey], created_at: T + 3 })
    )
    const state = state_of([announcement, issue, vouch])
    expect(state.tasks[issue.id].is_hidden).to.equal(false)
  })

  it('counts an unmined issue from an established account', () => {
    const issue = issue_by(stranger, 'Established')
    const attestation = sign(
      steward,
      build_account_attestation({
        pubkey: stranger.pubkey,
        value: 'established',
        created_at: T
      })
    )
    const state = state_of([announcement, issue, attestation])
    expect(state.established).to.deep.equal([stranger.pubkey])
    expect(state.tasks[issue.id].is_hidden).to.equal(true)
  })

  it('shows a trusted contributor issue once a steward follows them', () => {
    const issue = issue_by(contributor, 'Contribution')
    const triage = sign(
      steward,
      build_vouch_set({ pubkeys: [contributor.pubkey], created_at: T + 2 })
    )
    const stranger_set = sign(
      stranger,
      build_vouch_set({ pubkeys: [stranger.pubkey], created_at: T + 2 })
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
        steward,
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

  it('sorts the closed column by latest activity alone', () => {
    const high = issue_by(steward, 'High', T + 1)
    const low = issue_by(steward, 'Low', T + 2)
    const close = (issue, status, created_at) =>
      sign(steward, build_task_status({ board, issue, status, created_at }))
    const events = [
      announcement,
      high,
      low,
      label(steward, high, PRIORITY, 'high', T + 3),
      label(steward, low, PRIORITY, 'low', T + 4),
      close(high, 'resolved', T + 5),
      close(low, 'closed', T + 6)
    ]
    expect(state_of(events).columns.closed).to.deep.equal([low.id, high.id])
  })
})

describe('task board view reducer: ambiguity rules', () => {
  const announcement = announce({ maintainers: [steward.pubkey] })

  it('counts comments only from stewards, trusted keys and the author', () => {
    const issue = issue_by(contributor, 'Mine')
    const triage = sign(
      steward,
      build_vouch_set({ pubkeys: [contributor.pubkey], created_at: T })
    )
    const comment = (key, created_at) =>
      sign(key, build_task_comment({ issue, content: 'x', created_at }))
    const state = state_of([
      announcement,
      triage,
      issue,
      comment(stranger, T + 50),
      comment(contributor, T + 5),
      comment(steward, T + 6)
    ])
    expect(state.tasks[issue.id].comment_count).to.equal(2)
    expect(state.tasks[issue.id].latest_activity_at).to.equal(T + 6)
  })

  it('ignores a deletion request for the announcement', () => {
    const deletion = sign(
      owner,
      build_deletion_request({ events: [announcement], created_at: T + 5 })
    )
    const state = state_of([announcement, deletion])
    expect(state.stewards).to.have.members([owner.pubkey, steward.pubkey])
  })

  it('takes a superseded issue off the board', () => {
    const old = issue_by(steward, 'Old')
    const replacement = sign(
      steward,
      build_task_issue({
        board,
        subject: 'New',
        supersedes_issue_id: old.id,
        created_at: T + 2
      })
    )
    const state = state_of([announcement, old, replacement])
    expect(state.tasks[old.id].superseded_by).to.equal(replacement.id)
    const listed = Object.values(state.columns).flat()
    expect(listed).to.include(replacement.id)
    expect(listed).to.not.include(old.id)
  })

  it('ignores a supersede marker from a key that may not replace the issue', () => {
    const old = issue_by(steward, 'Old')
    const triage = sign(
      steward,
      build_vouch_set({ pubkeys: [contributor.pubkey], created_at: T })
    )
    const hijack = sign(
      contributor,
      build_task_issue({
        board,
        subject: 'Hijack',
        supersedes_issue_id: old.id,
        created_at: T + 2
      })
    )
    const state = state_of([announcement, triage, old, hijack])
    expect(state.tasks[old.id].superseded_by).to.equal(null)
    expect(Object.values(state.columns).flat()).to.include(old.id)
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
      5, 1111, 1621, 1630, 1631, 1632, 1633, 1985, 10011, 30000, 30617, 30634,
      30636
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
    const agent = examples.find(
      (e) => e.kind === 30636 && e.tags.some((t) => t[3] === 'acts_for')
    )
    expect(state.key_relations[agent.pubkey].acts_for[0].confirmed).to.equal(
      true
    )
    const block = examples.find((e) =>
      e.tags.some((t) => t[0] === 'd' && t[1] === 'nano-community-blocked')
    )
    const blocked = block.tags.find((t) => t[0] === 'p')[1]
    expect(state.blocked).to.deep.equal([blocked])
    const steps = Object.values(state.trust).map((entry) => entry.step)
    expect(steps.sort()).to.deep.equal([1, 1, 2])
    const binding = examples.find((e) => e.kind === 10011)
    expect(state.account_attestations[binding.pubkey].value).to.equal(
      'established'
    )
  })
})

describe('task board key relations', () => {
  const properties = (key, relations, created_at = T + 5) =>
    sign(key, build_key_properties({ board, relations, created_at }))

  it('confirms acts_for only when the other key states delegates_to', () => {
    const claimed = state_of([
      properties(contributor, [{ role: 'acts_for', pubkey: stranger.pubkey }])
    ])
    expect(claimed.key_relations[contributor.pubkey].acts_for).to.deep.equal([
      { pubkey: stranger.pubkey, confirmed: false }
    ])

    const confirmed = state_of([
      properties(contributor, [{ role: 'acts_for', pubkey: stranger.pubkey }]),
      properties(stranger, [
        { role: 'delegates_to', pubkey: contributor.pubkey }
      ])
    ])
    expect(confirmed.key_relations[contributor.pubkey].acts_for).to.deep.equal([
      { pubkey: stranger.pubkey, confirmed: true }
    ])
    expect(confirmed.key_relations[stranger.pubkey].delegates_to).to.deep.equal(
      [{ pubkey: contributor.pubkey, confirmed: true }]
    )
  })

  it('reads only the latest properties event of a key', () => {
    const state = state_of([
      properties(
        contributor,
        [{ role: 'acts_for', pubkey: stranger.pubkey }],
        T + 5
      ),
      properties(contributor, [], T + 6)
    ])
    expect(state.key_relations[contributor.pubkey]).to.deep.equal({})
  })

  it('ignores roles it does not know and other boards', () => {
    const other_board = { owner_pubkey: owner.pubkey, d_tag: 'other' }
    const unknown_role = properties(contributor, [])
    unknown_role.tags.push(['p', stranger.pubkey, '', 'mentors'])
    const resigned = sign(contributor, {
      kind: unknown_role.kind,
      created_at: unknown_role.created_at,
      tags: unknown_role.tags,
      content: ''
    })
    const elsewhere = sign(
      stranger,
      build_key_properties({
        board: other_board,
        relations: [{ role: 'acts_for', pubkey: contributor.pubkey }],
        created_at: T + 5
      })
    )
    const state = state_of([resigned, elsewhere])
    expect(state.key_relations[contributor.pubkey]).to.deep.equal({})
    expect(state.key_relations[stranger.pubkey]).to.equal(undefined)
  })

  it('edits one relation and keeps tags it does not understand', () => {
    const previous = properties(contributor, [
      { role: 'acts_for', pubkey: stranger.pubkey }
    ])
    previous.tags.push(['nano_account', 'nano_1abc'])
    const added = edit_key_relation({
      board,
      previous,
      role: 'delegates_to',
      pubkey: steward.pubkey
    })
    expect(added.tags.filter((t) => t[0] === 'p')).to.deep.equal([
      ['p', stranger.pubkey, '', 'acts_for'],
      ['p', steward.pubkey, '', 'delegates_to']
    ])
    expect(added.tags).to.deep.include(['nano_account', 'nano_1abc'])
    const removed = edit_key_relation({
      board,
      previous: { tags: added.tags },
      role: 'acts_for',
      pubkey: stranger.pubkey,
      remove: true
    })
    expect(removed.tags.filter((t) => t[0] === 'p')).to.deep.equal([
      ['p', steward.pubkey, '', 'delegates_to']
    ])
  })

  it('refuses to build a relation role it does not know', () => {
    expect(() =>
      build_key_properties({
        board,
        relations: [{ role: 'owns', pubkey: stranger.pubkey }]
      })
    ).to.throw('unknown relation role')
  })
})
