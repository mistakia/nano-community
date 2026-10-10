// Sign and publish the task board announcement (kind 30617) with the
// board-owner key. The announcement names the stewards in `maintainers`; a new
// one replaces the last, so adding or rotating a steward is a re-run with a
// new --maintainers list.
//
// The owner secret key (nsec or hex) is read from stdin, never argv:
//   <vault read of the owner key> | node scripts/publish-task-board-announcement.mjs \
//     --maintainers <hex,...> [--relays <url,...>] [--publish]
// Without --publish it prints the signed event and publishes nothing, so the
// exact event can be reviewed first. Signed events are permanent once a relay
// has them.

import fs from 'fs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import WebSocket from 'ws'
import { finalizeEvent, getPublicKey, nip19 } from 'nostr-tools'
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool'
import { hexToBytes } from 'nostr-tools/utils'

import {
  TASK_BOARD_OWNER_PUBKEY,
  TASK_BOARD_D_TAG,
  TASK_BOARD_DEFAULT_RELAYS,
  build_board_announcement
} from '#common/task-board/index.mjs'

// Node's built-in WebSocket overflows the stack inside nostr-tools when a
// relay connection fails; the ws package does not.
useWebSocketImplementation(WebSocket)

const BOARD_NAME = 'Nano Community Tasks'
const BOARD_DESCRIPTION =
  'Nano community task board: what is being worked on and what needs a taker.'
const BOARD_WEB_URLS = ['https://nano.community/roadmap']
const BOARD_TOPICS = ['nano']

const split = (value) =>
  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const read_secret_key = (text) => {
  const value = text.trim()
  if (value.startsWith('nsec1')) return nip19.decode(value).data
  if (/^[0-9a-f]{64}$/i.test(value)) return hexToBytes(value)
  throw new Error('stdin is not an nsec or a 64-character hex secret key')
}

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .option('maintainers', {
      describe: 'Comma-separated steward pubkeys (hex)',
      type: 'string',
      demandOption: true
    })
    .option('relays', {
      describe: 'Comma-separated relays for the relays tag and the publish',
      type: 'string'
    })
    .option('publish', {
      describe: 'Publish the signed event; without it, only print it',
      type: 'boolean',
      default: false
    }).argv

  const maintainers = split(argv.maintainers)
  for (const pubkey of maintainers) {
    if (!/^[0-9a-f]{64}$/.test(pubkey)) {
      throw new Error(`maintainer is not a hex pubkey: ${pubkey}`)
    }
  }
  const relays = argv.relays ? split(argv.relays) : TASK_BOARD_DEFAULT_RELAYS

  const secret_key = read_secret_key(fs.readFileSync(0, 'utf8'))
  const owner_pubkey = getPublicKey(secret_key)
  if (owner_pubkey !== TASK_BOARD_OWNER_PUBKEY) {
    throw new Error(
      `key is not the board owner: ${owner_pubkey} != ${TASK_BOARD_OWNER_PUBKEY}`
    )
  }

  const event = finalizeEvent(
    build_board_announcement({
      board: { owner_pubkey, d_tag: TASK_BOARD_D_TAG },
      name: BOARD_NAME,
      description: BOARD_DESCRIPTION,
      web_urls: BOARD_WEB_URLS,
      relays,
      maintainers,
      topics: BOARD_TOPICS
    }),
    secret_key
  )
  console.log(JSON.stringify(event, null, 2))
  if (!argv.publish) {
    console.log('not published: rerun with --publish to send it')
    return
  }

  const pool = new SimplePool()
  const results = await Promise.allSettled(pool.publish(relays, event))
  let accepted = 0
  results.forEach((result, index) => {
    const ok = result.status === 'fulfilled'
    if (ok) accepted += 1
    console.log(
      `${relays[index]}: ${ok ? 'accepted' : `rejected (${result.reason})`}`
    )
  })
  pool.close(relays)
  if (!accepted) process.exit(1)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
