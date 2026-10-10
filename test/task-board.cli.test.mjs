/* global describe it before after */
import chai from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ws from 'ws'
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19
} from 'nostr-tools'
import { matchFilter } from 'nostr-tools/filter'
import { bytesToHex } from 'nostr-tools/utils'

import {
  build_board_announcement,
  build_task_issue
} from '#common/task-board/index.mjs'

const expect = chai.expect
const WebSocketServer = ws.Server
const run = promisify(execFile)
const CLI = path.resolve('scripts/task-board.mjs')

// A relay that keeps every event in memory and answers REQ by filter.
function start_relay() {
  const events = []
  const server = new WebSocketServer({ port: 0 })
  server.on('connection', (socket) => {
    socket.on('message', (data) => {
      const [type, ...rest] = JSON.parse(data)
      if (type === 'EVENT') {
        const [event] = rest
        events.push(event)
        socket.send(JSON.stringify(['OK', event.id, true, '']))
      } else if (type === 'REQ') {
        const [subscription_id, ...filters] = rest
        for (const event of events) {
          if (filters.some((filter) => matchFilter(filter, event))) {
            socket.send(JSON.stringify(['EVENT', subscription_id, event]))
          }
        }
        socket.send(JSON.stringify(['EOSE', subscription_id]))
      }
    })
  })
  return new Promise((resolve) =>
    server.on('listening', () =>
      resolve({
        url: `ws://127.0.0.1:${server.address().port}`,
        events,
        close: () => server.close()
      })
    )
  )
}

describe('task board CLI', function () {
  this.timeout(30000)

  const owner_key = generateSecretKey()
  const owner_pubkey = getPublicKey(owner_key)
  const board = { owner_pubkey, d_tag: 'nano-community-tasks' }
  const agent_key = generateSecretKey()
  const agent_pubkey = getPublicKey(agent_key)
  let relay
  let key_file
  let issue

  const cli = async (...args) => {
    const { stdout } = await run('node', [
      CLI,
      ...args,
      '--relays',
      relay.url,
      '--board',
      owner_pubkey
    ])
    return JSON.parse(stdout)
  }
  const read_task = () => cli('read', '--task', issue.id)

  before(async () => {
    relay = await start_relay()
    relay.events.push(
      finalizeEvent(
        build_board_announcement({ board, name: 'Test board' }),
        owner_key
      )
    )
    issue = finalizeEvent(
      build_task_issue({ board, subject: 'Write docs', content: 'Body' }),
      owner_key
    )
    relay.events.push(issue)
    key_file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'task-board-cli-')),
      'agent.key'
    )
    fs.writeFileSync(key_file, bytesToHex(agent_key), { mode: 0o600 })
  })

  after(() => relay.close())

  it('reads the board as JSON', async () => {
    const state = await cli('read')
    expect(state.stewards).to.deep.equal([owner_pubkey])
    expect(state.tasks[issue.id].is_hidden).to.equal(false)
    expect(state.columns[state.tasks[issue.id].column]).to.include(issue.id)
  })

  it('claims a task with a key file', async () => {
    const result = await cli('claim', issue.id, '--key-file', key_file)
    expect(result.pubkey).to.equal(agent_pubkey)
    expect((await read_task()).active_claimants).to.deep.equal([agent_pubkey])
  })

  it('hands off with a pull request link and renews the claim', async () => {
    const before_claim = (await read_task()).claims[0]
    const result = await cli(
      'comment',
      issue.id,
      '--content',
      'Done in the linked PR',
      '--pr',
      'https://github.com/mistakia/nano-community/pull/1',
      '--key-file',
      key_file
    )
    const [comment, renewal] = result.published.map((p) => p.event)
    expect(comment.tags).to.deep.include([
      'r',
      'https://github.com/mistakia/nano-community/pull/1'
    ])
    expect(renewal.kind).to.equal(30634)
    expect(renewal.created_at).to.be.greaterThan(before_claim.created_at)
    const task = await read_task()
    // An unvouched key's comment is stored but does not count toward activity.
    expect(task.comment_count).to.equal(0)
    expect(task.active_claimants).to.deep.equal([agent_pubkey])
  })

  it('releases the claim', async () => {
    await cli('release', issue.id, '--key-file', key_file)
    expect((await read_task()).active_claimants).to.deep.equal([])
  })

  it('files a task that stays hidden until a steward vouches', async () => {
    const result = await cli(
      'file',
      '--subject',
      'Agent filed task',
      '--key-file',
      key_file
    )
    const [{ event }] = result.published
    const state = await cli('read')
    expect(state.tasks[event.id].is_hidden).to.equal(true)
  })

  it('vouches for a key, keeping the vouch set, and withdraws it', async () => {
    const owner_file = path.join(path.dirname(key_file), 'owner.key')
    fs.writeFileSync(owner_file, bytesToHex(owner_key), { mode: 0o600 })
    const other = getPublicKey(generateSecretKey())
    await cli('vouch', nip19.npubEncode(other), '--key-file', owner_file)
    await cli('vouch', nip19.npubEncode(agent_pubkey), '--key-file', owner_file)
    let state = await cli('read')
    expect(state.trust[agent_pubkey]).to.deep.equal({
      step: 1,
      vouchers: [owner_pubkey]
    })
    expect(state.trusted).to.include(other)
    const filed = Object.values(state.tasks).find(
      (task) => task.subject === 'Agent filed task'
    )
    expect(filed.is_hidden).to.equal(false)

    await cli('unvouch', agent_pubkey, '--key-file', owner_file)
    state = await cli('read')
    expect(state.trusted).to.deep.equal([other])
  })

  it('blocks a vouched key, keeping the block set, and lifts the block', async () => {
    const owner_file = path.join(path.dirname(key_file), 'owner.key')
    fs.writeFileSync(owner_file, bytesToHex(owner_key), { mode: 0o600 })
    const other = getPublicKey(generateSecretKey())
    await cli('vouch', agent_pubkey, '--key-file', owner_file)
    await cli('block', nip19.npubEncode(other), '--key-file', owner_file)
    await cli('block', nip19.npubEncode(agent_pubkey), '--key-file', owner_file)
    let state = await cli('read')
    expect(state.blocked).to.have.members([other, agent_pubkey])
    expect(state.trusted).to.not.include(agent_pubkey)

    await cli('unblock', agent_pubkey, '--key-file', owner_file)
    state = await cli('read')
    expect(state.blocked).to.deep.equal([other])
    expect(state.trusted).to.include(agent_pubkey)
  })

  it('ignores a status change from a non-steward who is not the author', async () => {
    await cli('status', issue.id, 'resolved', '--key-file', key_file)
    expect((await read_task()).status).to.equal('open')
  })
})
