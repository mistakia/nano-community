/* global describe it */
import chai from 'chai'

import {
  build_board_announcement,
  build_task_issue,
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  build_triage_set,
  build_deletion_request,
  format_board_address,
  CLAIM_LIFETIME_SECONDS
} from '#common/task-board/index.mjs'

const expect = chai.expect

const OWNER = 'a'.repeat(64)
const AUTHOR = 'b'.repeat(64)
const COMMENTER = 'c'.repeat(64)
const ISSUE_ID = '1'.repeat(64)
const COMMENT_ID = '2'.repeat(64)
const board = { owner_pubkey: OWNER, d_tag: 'nano-community-tasks' }
const board_address = `30617:${OWNER}:nano-community-tasks`
const issue = { id: ISSUE_ID, pubkey: AUTHOR }
const created_at = 1760000000

describe('task board event templates', () => {
  it('formats the board address', () => {
    expect(format_board_address(board)).to.equal(board_address)
  })

  it('builds the board announcement without a clone tag', () => {
    const event = build_board_announcement({
      board,
      name: 'Nano community tasks',
      description: 'desc',
      web_urls: ['https://nano.community/roadmap'],
      relays: ['wss://relay.nano.community'],
      maintainers: [AUTHOR],
      topics: ['nano'],
      created_at
    })
    expect(event).to.deep.equal({
      kind: 30617,
      created_at,
      content: '',
      tags: [
        ['d', 'nano-community-tasks'],
        ['name', 'Nano community tasks'],
        ['description', 'desc'],
        ['web', 'https://nano.community/roadmap'],
        ['relays', 'wss://relay.nano.community'],
        ['maintainers', AUTHOR],
        ['t', 'nano']
      ]
    })
  })

  it('builds a NIP-34 issue with board a and owner p tags', () => {
    const event = build_task_issue({
      board,
      subject: 'Do a thing',
      content: 'body',
      topics: ['docs'],
      base_entity_id: 'entity-1',
      supersedes_issue_id: COMMENT_ID,
      created_at
    })
    expect(event).to.deep.equal({
      kind: 1621,
      created_at,
      content: 'body',
      tags: [
        ['a', board_address],
        ['p', OWNER],
        ['subject', 'Do a thing'],
        ['t', 'docs'],
        ['base_entity_id', 'entity-1'],
        ['e', COMMENT_ID, '', 'supersedes']
      ]
    })
  })

  it('builds statuses with p tags to the owner and the issue author', () => {
    const kinds = { open: 1630, resolved: 1631, closed: 1632, draft: 1633 }
    for (const [status, kind] of Object.entries(kinds)) {
      const event = build_task_status({ board, issue, status, created_at })
      expect(event.kind).to.equal(kind)
      expect(event.tags).to.deep.equal([
        ['e', ISSUE_ID, '', 'root'],
        ['a', board_address],
        ['p', OWNER],
        ['p', AUTHOR]
      ])
    }
  })

  it('does not repeat the owner p tag on an owner-authored issue', () => {
    const event = build_task_status({
      board,
      issue: { id: ISSUE_ID, pubkey: OWNER },
      status: 'open',
      created_at
    })
    expect(event.tags.filter((t) => t[0] === 'p')).to.deep.equal([['p', OWNER]])
  })

  it('rejects an unknown status', () => {
    expect(() => build_task_status({ board, issue, status: 'done' })).to.throw()
  })

  it('builds a NIP-32 label with one namespace', () => {
    const event = build_task_label({
      issue,
      namespace: 'community.nano.priority',
      value: 'high',
      created_at
    })
    expect(event).to.deep.equal({
      kind: 1985,
      created_at,
      content: '',
      tags: [
        ['L', 'community.nano.priority'],
        ['l', 'high', 'community.nano.priority'],
        ['e', ISSUE_ID]
      ]
    })
  })

  it('rejects a label value outside its namespace', () => {
    expect(() =>
      build_task_label({
        issue,
        namespace: 'community.nano.state',
        value: 'high'
      })
    ).to.throw()
  })

  it('builds a claim with a default 30 day expiration', () => {
    const event = build_task_claim({ board, issue, created_at })
    expect(event).to.deep.equal({
      kind: 30634,
      created_at,
      content: '',
      tags: [
        ['d', ISSUE_ID],
        ['e', ISSUE_ID],
        ['a', board_address],
        ['status', 'active'],
        ['expiration', String(created_at + CLAIM_LIFETIME_SECONDS)]
      ]
    })
    expect(CLAIM_LIFETIME_SECONDS).to.equal(2592000)
  })

  it('builds a released claim', () => {
    const event = build_task_claim({
      board,
      issue,
      status: 'released',
      created_at
    })
    expect(event.tags).to.deep.include(['status', 'released'])
  })

  it('builds a top-level NIP-22 comment on the issue', () => {
    const event = build_task_comment({ issue, content: 'hello', created_at })
    expect(event).to.deep.equal({
      kind: 1111,
      created_at,
      content: 'hello',
      tags: [
        ['E', ISSUE_ID, '', AUTHOR],
        ['K', '1621'],
        ['P', AUTHOR],
        ['e', ISSUE_ID, '', AUTHOR],
        ['k', '1621'],
        ['p', AUTHOR]
      ]
    })
  })

  it('builds a NIP-22 reply to a comment', () => {
    const parent = { id: COMMENT_ID, pubkey: COMMENTER, kind: 1111 }
    const event = build_task_comment({
      issue,
      parent,
      content: 'reply',
      created_at
    })
    expect(event.tags).to.deep.equal([
      ['E', ISSUE_ID, '', AUTHOR],
      ['K', '1621'],
      ['P', AUTHOR],
      ['e', COMMENT_ID, '', COMMENTER],
      ['k', '1111'],
      ['p', COMMENTER]
    ])
  })

  it('builds the triage follow set', () => {
    const event = build_triage_set({ pubkeys: [AUTHOR, COMMENTER], created_at })
    expect(event.kind).to.equal(30000)
    expect(event.tags).to.deep.equal([
      ['d', 'nano-community-contributors'],
      ['title', 'Nano community trusted contributors'],
      ['p', AUTHOR],
      ['p', COMMENTER]
    ])
  })

  it('builds a NIP-09 deletion request', () => {
    const event = build_deletion_request({
      events: [{ id: ISSUE_ID, kind: 1621 }],
      reason: 'no longer public',
      created_at
    })
    expect(event).to.deep.equal({
      kind: 5,
      created_at,
      content: 'no longer public',
      tags: [
        ['e', ISSUE_ID],
        ['k', '1621']
      ]
    })
  })
})
