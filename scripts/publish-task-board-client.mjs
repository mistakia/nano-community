// Release the standalone task board client as a NIP-5A named site.
//
// Uploads build/task-board-client/index.html to Blossom servers (BUD-02,
// authorized per BUD-11), then publishes a kind 35128 manifest (d =
// nano-tasks) that maps /index.html to the file's sha256 and lists the servers
// that accepted it. Any NIP-5A host then serves the client at
// https://<pubkeyB36>nano-tasks.<host>. Prints the sha256 so it can be
// recorded in docs/design/task-board-protocol.md.
//
// Any steward can run it with their own key:
//   yarn build:task-board-client
//   node scripts/publish-task-board-client.mjs --key-file <0600 file with hex secret key>
// The key is read from a file (or stdin with --key-file -), never argv.

import crypto from 'crypto'
import fs from 'fs'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import WebSocket from 'ws'
import { finalizeEvent, getPublicKey } from 'nostr-tools'
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool'
import { hexToBytes } from 'nostr-tools/utils'

import { TASK_BOARD_DEFAULT_RELAYS } from '#common/task-board/constants.mjs'

// Node's built-in WebSocket overflows the stack inside nostr-tools when a
// relay connection fails; the ws package does not.
useWebSocketImplementation(WebSocket)

export const NSITE_KIND = 35128
export const NSITE_D_TAG = 'nano-tasks'
// Run by different operators; both accepted and served the client on
// 2026-10-10.
export const DEFAULT_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://nostr.download'
]
// Public relays only: the community relay accepts board events alone.
const DEFAULT_MANIFEST_RELAYS = TASK_BOARD_DEFAULT_RELAYS.filter(
  (url) => !url.includes('relay.nano.community')
)
const MIN_SERVERS = 2
const SOURCE_URL = 'https://github.com/mistakia/nano-community'

const sha256_hex = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex')

export const encode_pubkey_base36 = (pubkey) =>
  BigInt(`0x${pubkey}`).toString(36).padStart(50, '0')

export const nsite_hostname = ({ pubkey, d_tag = NSITE_D_TAG, host }) =>
  `${encode_pubkey_base36(pubkey)}${d_tag}.${host}`

export const aggregate_hash = (path_tags) =>
  sha256_hex(
    Buffer.from(
      path_tags
        .map(([, path, hash]) => `${hash} ${path}\n`)
        .sort()
        .join(''),
      'utf8'
    )
  )

export function build_manifest({ sha256, servers, created_at }) {
  const path_tags = [['path', '/index.html', sha256]]
  return {
    kind: NSITE_KIND,
    created_at,
    content: '',
    tags: [
      ['d', NSITE_D_TAG],
      ...path_tags,
      ['x', aggregate_hash(path_tags), 'aggregate'],
      ...servers.map((server) => ['server', server]),
      ['title', 'Nano Community Tasks'],
      ['description', 'Standalone client for the Nano community task board'],
      ['source', SOURCE_URL]
    ]
  }
}

async function upload_blob({ server, body, sha256, secret_key }) {
  const now = Math.floor(Date.now() / 1000)
  const auth = finalizeEvent(
    {
      kind: 24242,
      created_at: now,
      content: 'Upload the Nano community task board client',
      tags: [
        ['t', 'upload'],
        ['x', sha256],
        ['expiration', String(now + 300)]
      ]
    },
    secret_key
  )
  const response = await fetch(`${server}/upload`, {
    method: 'PUT',
    body,
    headers: {
      Authorization: `Nostr ${Buffer.from(JSON.stringify(auth)).toString('base64')}`,
      'Content-Type': 'text/html',
      'Content-Length': String(body.length),
      'X-SHA-256': sha256
    }
  })
  if (!response.ok) {
    const reason = response.headers.get('x-reason') || ''
    throw new Error(`HTTP ${response.status} ${reason}`.trim())
  }
  const descriptor = await response.json()
  if (descriptor.sha256 !== sha256) {
    throw new Error(`server stored ${descriptor.sha256}, expected ${sha256}`)
  }
  return descriptor
}

const read_secret_key = (key_file) => {
  const hex = fs.readFileSync(key_file === '-' ? 0 : key_file, 'utf8').trim()
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('key file must hold a 64-character hex secret key')
  }
  return hexToBytes(hex)
}

export async function publish_task_board_client({
  file,
  key_file,
  servers,
  relays,
  dry_run
}) {
  const body = fs.readFileSync(file)
  const sha256 = sha256_hex(body)
  const secret_key = read_secret_key(key_file)
  const pubkey = getPublicKey(secret_key)
  console.log(`client ${file}`)
  console.log(`sha256 ${sha256}`)
  console.log(`publisher ${pubkey}`)
  if (dry_run) return { sha256, pubkey }

  const accepted = []
  for (const server of servers) {
    try {
      const descriptor = await upload_blob({ server, body, sha256, secret_key })
      accepted.push(server)
      console.log(`uploaded ${server} -> ${descriptor.url}`)
    } catch (error) {
      console.log(`upload failed ${server}: ${error.message}`)
    }
  }
  if (accepted.length < MIN_SERVERS) {
    throw new Error(
      `only ${accepted.length} Blossom server(s) accepted the client; need ${MIN_SERVERS}`
    )
  }

  const manifest = finalizeEvent(
    build_manifest({
      sha256,
      servers: accepted,
      created_at: Math.floor(Date.now() / 1000)
    }),
    secret_key
  )
  const pool = new SimplePool()
  const results = await Promise.allSettled(pool.publish(relays, manifest))
  pool.close(relays)
  const published = relays.filter((_, i) => results[i].status === 'fulfilled')
  for (const [i, url] of relays.entries()) {
    console.log(
      `manifest ${url}: ${results[i].status === 'fulfilled' ? 'ok' : results[i].reason}`
    )
  }
  if (!published.length) throw new Error('no relay accepted the manifest')
  console.log(`manifest ${manifest.id}`)
  console.log(
    `nsite https://${nsite_hostname({ pubkey, host: '<nsite host>' })}`
  )
  return { sha256, pubkey, manifest, servers: accepted, relays: published }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = yargs(hideBin(process.argv))
    .option('file', {
      type: 'string',
      default: 'build/task-board-client/index.html'
    })
    .option('key-file', {
      type: 'string',
      demandOption: true,
      describe: 'File holding the hex secret key, or - for stdin'
    })
    .option('servers', {
      type: 'string',
      describe: 'Comma-separated Blossom server URLs'
    })
    .option('relays', {
      type: 'string',
      describe: 'Comma-separated relays for the manifest'
    })
    .option('dry-run', { type: 'boolean', default: false })
    .strict().argv

  const split = (value) => value.split(',').map((url) => url.trim())
  publish_task_board_client({
    file: argv.file,
    key_file: argv['key-file'],
    servers: argv.servers ? split(argv.servers) : DEFAULT_BLOSSOM_SERVERS,
    relays: argv.relays ? split(argv.relays) : DEFAULT_MANIFEST_RELAYS,
    dry_run: argv['dry-run']
  })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message)
      process.exit(1)
    })
}
