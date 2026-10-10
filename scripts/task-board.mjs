// Read and act on the Nano community task board from a terminal or an agent.
//
//   node scripts/task-board.mjs read [--task <issue_id>]
//   node scripts/task-board.mjs claim <issue_id> --key-file <file>
//   node scripts/task-board.mjs release <issue_id> --key-file <file>
//   node scripts/task-board.mjs comment <issue_id> --content <text> [--pr <url>] --key-file <file>
//   node scripts/task-board.mjs status <issue_id> <open|resolved|closed|draft> --key-file <file>
//   node scripts/task-board.mjs file --subject <text> [--content <text>] --key-file <file>
//
// Output is JSON. The key file holds an nsec or a 64-character hex secret key;
// `--key-file -` reads it from stdin. It is never read from argv. Every
// fetched event's signature is verified before it is reduced. Like the portal,
// any action on a task re-signs the actor's active claim on it, and a claim is
// dated after the actor's previous one. The protocol is
// docs/design/task-board-protocol.md; AGENTS.md is the short route.

import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import WebSocket from 'ws'
import { finalizeEvent, getPublicKey, nip19, verifyEvent } from 'nostr-tools'
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool'
import { hexToBytes } from 'nostr-tools/utils'

import {
  TASK_BOARD_KINDS,
  TASK_BOARD_OWNER_PUBKEY,
  TASK_BOARD_D_TAG,
  TASK_BOARD_DEFAULT_RELAYS,
  TASK_STATUS_KINDS,
  build_board_filters,
  build_issue_filters,
  build_task_board_state,
  build_task_claim,
  build_task_comment,
  build_task_issue,
  build_task_status,
  order_claim_after
} from '#common/task-board/index.mjs'

// Node's built-in WebSocket overflows the stack inside nostr-tools when a
// relay connection fails; the ws package does not.
useWebSocketImplementation(WebSocket)

const QUERY_MAX_WAIT_MS = 8000

const split = (value) =>
  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const to_hex_pubkey = (value) =>
  value.startsWith('npub1') ? nip19.decode(value).data : value.toLowerCase()

const read_secret_key = (key_file) => {
  const text = fs.readFileSync(key_file === '-' ? 0 : key_file, 'utf8').trim()
  if (text.startsWith('nsec1')) return nip19.decode(text).data
  if (/^[0-9a-f]{64}$/i.test(text)) return hexToBytes(text)
  throw new Error('key file is not an nsec or a 64-character hex secret key')
}

const query = async ({ pool, relays, filters }) => {
  const batches = await Promise.all(
    filters.map((filter) =>
      pool.querySync(relays, filter, { maxWait: QUERY_MAX_WAIT_MS })
    )
  )
  return batches.flat()
}

export async function load_board({ pool, relays, board }) {
  const by_id = new Map()
  const add = (events) => {
    for (const event of events) {
      if (!by_id.has(event.id) && verifyEvent(event)) by_id.set(event.id, event)
    }
  }
  add(await query({ pool, relays, filters: build_board_filters(board) }))
  const issue_ids = [...by_id.values()]
    .filter((event) => event.kind === TASK_BOARD_KINDS.issue)
    .map((event) => event.id)
  if (issue_ids.length) {
    add(await query({ pool, relays, filters: build_issue_filters(issue_ids) }))
  }
  const events = [...by_id.values()]
  return { events, state: build_task_board_state({ events, board }) }
}

async function publish({ pool, relays, template, secret_key }) {
  const event = finalizeEvent(template, secret_key)
  const results = await Promise.allSettled(pool.publish(relays, event))
  const relay_results = Object.fromEntries(
    results.map((result, index) => [
      relays[index],
      result.status === 'fulfilled' ? 'accepted' : String(result.reason)
    ])
  )
  if (!results.some((result) => result.status === 'fulfilled')) {
    const error = new Error('no relay accepted the event')
    error.relay_results = relay_results
    throw error
  }
  return { event, relay_results }
}

const require_task = (state, issue_id) => {
  const task = state.tasks[issue_id]
  if (!task) throw new Error(`no task ${issue_id} on the board`)
  return task
}

const own_claim = (task, pubkey) =>
  task.claims.find((claim) => claim.pubkey === pubkey) || null

async function act({ argv, build }) {
  const pool = new SimplePool()
  try {
    const secret_key = read_secret_key(argv['key-file'])
    const pubkey = getPublicKey(secret_key)
    const { state } = await load_board({
      pool,
      relays: argv.relays,
      board: argv.board
    })
    const template = build({ state, pubkey })
    const published = [
      await publish({ pool, relays: argv.relays, template, secret_key })
    ]
    // Any action on a task keeps the actor's active claim on it alive.
    const issue_id = argv.issue_id
    if (issue_id && template.kind !== TASK_BOARD_KINDS.claim) {
      const task = require_task(state, issue_id)
      if (task.active_claimants.includes(pubkey)) {
        const renewal = order_claim_after({
          template: build_task_claim({ board: argv.board, issue: task }),
          previous: own_claim(task, pubkey)
        })
        published.push(
          await publish({
            pool,
            relays: argv.relays,
            template: renewal,
            secret_key
          })
        )
      }
    }
    return { pubkey, published }
  } finally {
    pool.close(argv.relays)
  }
}

const claim_builder =
  (status) =>
  ({ argv }) =>
  ({ state, pubkey }) => {
    const task = require_task(state, argv.issue_id)
    return order_claim_after({
      template: build_task_claim({ board: argv.board, issue: task, status }),
      previous: own_claim(task, pubkey)
    })
  }

const builders = {
  claim: claim_builder('active'),
  release: claim_builder('released'),
  comment:
    ({ argv }) =>
    ({ state }) =>
      build_task_comment({
        issue: require_task(state, argv.issue_id),
        content: argv.content,
        references: argv.pr ? [argv.pr] : []
      }),
  status:
    ({ argv }) =>
    ({ state }) =>
      build_task_status({
        board: argv.board,
        issue: require_task(state, argv.issue_id),
        status: argv.status
      }),
  file:
    ({ argv }) =>
    () =>
      build_task_issue({
        board: argv.board,
        subject: argv.subject,
        content: argv.content || ''
      })
}

const print = (value) => console.log(JSON.stringify(value, null, 2))

const main = async () => {
  const key_file = {
    'key-file': {
      describe: 'File with an nsec or hex secret key, or - for stdin',
      type: 'string',
      demandOption: true
    }
  }
  const issue = (y) =>
    y.positional('issue_id', { describe: 'Issue event id', type: 'string' })
  const argv = await yargs(hideBin(process.argv))
    .option('relays', {
      describe: 'Comma-separated relays',
      type: 'string',
      default: TASK_BOARD_DEFAULT_RELAYS.join(','),
      coerce: split
    })
    .option('board', {
      describe: 'Board as <owner npub or hex>[:<d>]',
      type: 'string',
      default: `${TASK_BOARD_OWNER_PUBKEY}:${TASK_BOARD_D_TAG}`,
      coerce: (value) => {
        const [owner, d_tag = TASK_BOARD_D_TAG] = value.split(':')
        return { owner_pubkey: to_hex_pubkey(owner), d_tag }
      }
    })
    .command('read', 'Print the board state as JSON', (y) =>
      y.option('task', { describe: 'Print one task', type: 'string' })
    )
    .command('claim <issue_id>', 'Claim a task', (y) =>
      issue(y).options(key_file)
    )
    .command('release <issue_id>', 'Release your claim', (y) =>
      issue(y).options(key_file)
    )
    .command('comment <issue_id>', 'Comment on a task', (y) =>
      issue(y)
        .options(key_file)
        .option('content', { type: 'string', demandOption: true })
        .option('pr', {
          describe: 'Pull request URL to hand off',
          type: 'string'
        })
    )
    .command('status <issue_id> <status>', 'Set a task status', (y) =>
      issue(y)
        .options(key_file)
        .positional('status', { choices: Object.keys(TASK_STATUS_KINDS) })
    )
    .command('file', 'File a new task', (y) =>
      y
        .options(key_file)
        .option('subject', { type: 'string', demandOption: true })
        .option('content', { type: 'string' })
    )
    .demandCommand(1)
    .strict().argv

  const [command] = argv._
  if (command === 'read') {
    const pool = new SimplePool()
    try {
      const { state } = await load_board({
        pool,
        relays: argv.relays,
        board: argv.board
      })
      print(argv.task ? require_task(state, argv.task) : state)
    } finally {
      pool.close(argv.relays)
    }
    return
  }
  print(await act({ argv, build: builders[command]({ argv }) }))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      JSON.stringify({ error: error.message, relays: error.relay_results })
    )
    process.exit(1)
  })
