#!/usr/bin/env node
// strfry write-policy plugin for relay.nano.community.
// strfry runs this once and streams one JSON request per line on stdin.
// Config: TASK_BOARD_RELAY_CONFIG points at a JSON file with
//   { boards: [{ owner_pubkey, d_tag }], strfry_bin, strfry_config, rate_limits? }

import fs from 'fs'
import readline from 'readline'
import { spawnSync } from 'child_process'

import {
  create_relay_policy_state,
  seed_relay_policy_state,
  evaluate_relay_event,
  prune_rate_windows
} from '#libs-server/task-board-relay-policy.mjs'

const config = JSON.parse(
  fs.readFileSync(process.env.TASK_BOARD_RELAY_CONFIG, 'utf8')
)
const state = create_relay_policy_state(config)

const scan = spawnSync(
  config.strfry_bin,
  ['--config', config.strfry_config, 'scan', '{}'],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 }
)
if (scan.status !== 0) {
  process.stderr.write(`task-board policy: seed scan failed: ${scan.stderr}\n`)
  process.exit(1)
}
const stored_events = scan.stdout
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
seed_relay_policy_state(state, stored_events)
process.stderr.write(
  `task-board policy: seeded ${state.issue_ids.size} issues, ${state.board_pubkeys.size} pubkeys\n`
)

const lines = readline.createInterface({ input: process.stdin })
let requests_since_prune = 0
lines.on('line', (line) => {
  let request
  try {
    request = JSON.parse(line)
  } catch (err) {
    process.stderr.write('task-board policy: unparseable request\n')
    return
  }
  const { event } = request
  const result =
    request.type === 'new'
      ? evaluate_relay_event({
          state,
          event,
          source_type: request.sourceType,
          source_info: request.sourceInfo
        })
      : { action: 'reject', msg: 'error: unknown request type' }

  process.stdout.write(JSON.stringify({ id: event.id, ...result }) + '\n')

  requests_since_prune += 1
  if (requests_since_prune >= 1000) {
    prune_rate_windows(state, Math.floor(Date.now() / 1000))
    requests_since_prune = 0
  }
})
