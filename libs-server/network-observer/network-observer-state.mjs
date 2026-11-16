import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import debug from 'debug'

import { NETWORK_OBSERVER_MINIMUM_PEER_COUNT } from '#common/network-event-types.mjs'

const exec_file = promisify(execFile)
const log = debug('network-observer:state')

export const COVERAGE_PRODUCER = 'network_observer'

// Degraded mode suppresses not-voting begins at once, but raises its signal
// only once it has held this long, so the peer ramp after a restart never
// pages.
export const DEGRADED_SIGNAL_MINUTES = 10

// At least this share of principal representatives must have voted in the
// last threshold window.
export const MINIMUM_PRINCIPAL_VOTING_SHARE = 0.5

// The signal source names this producer on the store, and the close passes
// the same source as the emit.
export const SIGNAL_SOURCE = 'service:nano-community-network-observer'

// The host-aware bootstrap binfile: on this leaf host it spools locally and
// drains with a machine token.
const get_emit_signal_path = () =>
  process.env.EMIT_SIGNAL_PATH || '/root/bin/emit-signal'

// Saved detector state, written by rename so a crash mid-write leaves the
// previous copy whole.
export const save_observer_state = ({ state_file, observer_state, now_ms }) => {
  const temporary_file = `${state_file}.${process.pid}.tmp`
  fs.writeFileSync(
    temporary_file,
    JSON.stringify({ saved_at_ms: now_ms, ...observer_state })
  )
  fs.renameSync(temporary_file, state_file)
}

export const load_observer_state = ({ state_file }) => {
  try {
    return JSON.parse(fs.readFileSync(state_file, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log(`ignoring unreadable state ${state_file}: ${error.message}`)
    }
    return null
  }
}

export const ensure_data_directory = ({ data_directory }) => {
  fs.mkdirSync(path.join(data_directory, 'spool'), { recursive: true })
  return {
    spool_directory: path.join(data_directory, 'spool'),
    state_file: path.join(data_directory, 'observer-state.json'),
    principal_cache_file: path.join(data_directory, 'principal-inputs.json')
  }
}

// Degraded means the observer cannot vouch for what it did not see: too few
// peers, no principal set, or fewer than half the principal representatives
// voting in the last window.
export const evaluate_degraded = ({ peer_count, principal_voting_share }) => {
  const degraded_reasons = []
  if (peer_count < NETWORK_OBSERVER_MINIMUM_PEER_COUNT) {
    degraded_reasons.push('peer_count_low')
  }
  if (principal_voting_share === null) {
    degraded_reasons.push('principal_set_unknown')
  } else if (principal_voting_share < MINIMUM_PRINCIPAL_VOTING_SHARE) {
    degraded_reasons.push('principal_voting_share_low')
  }
  return { is_degraded: degraded_reasons.length > 0, degraded_reasons }
}

// Coverage on the observed_at axis: a minute the observer watched without
// being degraded is covered, so consecutive healthy minutes tile and a
// degraded or down minute leaves a gap.
export const build_coverage_window = ({ began_at_ms, ended_at_ms }) => ({
  producer: COVERAGE_PRODUCER,
  coverage_began_at: Math.floor(began_at_ms / 1000),
  coverage_ended_at: Math.floor(ended_at_ms / 1000)
})

const run_emit_signal = async (args) => {
  try {
    await exec_file(get_emit_signal_path(), args, { timeout: 15000 })
    return true
  } catch (error) {
    log(`emit-signal ${args[0]} failed: ${error.message}`)
    return false
  }
}

// A condition signal raised and closed on transitions only. raised_keys is
// saved with the observer state. A key with no saved state is closed on the
// first healthy evaluation, so a signal open across a restart that lost its
// state still clears.
export const create_signal_tracker = ({ raised_keys = {} } = {}) => {
  const known = { ...raised_keys }

  const update = async ({ dedup_key, is_raised, title, payload, severity }) => {
    if (is_raised && known[dedup_key] !== true) {
      const delivered = await run_emit_signal([
        'emit',
        '--source',
        SIGNAL_SOURCE,
        '--kind',
        'service_health',
        '--severity',
        severity,
        '--title',
        title,
        '--payload',
        JSON.stringify(payload),
        '--dedup-key',
        dedup_key
      ])
      if (delivered) known[dedup_key] = true
    } else if (!is_raised && known[dedup_key] !== false) {
      const delivered = await run_emit_signal([
        'close',
        '--source',
        SIGNAL_SOURCE,
        '--dedup-key',
        dedup_key,
        '--resolution',
        'condition cleared on the network observer'
      ])
      if (delivered) known[dedup_key] = false
    }
  }

  return { update, get_raised_keys: () => ({ ...known }) }
}

// Tracks how long the observer has been degraded and raises the degraded
// signal once it has held for DEGRADED_SIGNAL_MINUTES.
export const update_degraded_signal = async ({
  signal_tracker,
  degraded_state,
  degraded,
  now_ms
}) => {
  if (degraded.is_degraded) {
    degraded_state.degraded_since_ms =
      degraded_state.degraded_since_ms ?? now_ms
  } else {
    degraded_state.degraded_since_ms = null
  }
  const is_raised =
    degraded.is_degraded &&
    now_ms - degraded_state.degraded_since_ms >=
      DEGRADED_SIGNAL_MINUTES * 60 * 1000
  if (degraded.is_degraded && !is_raised) return
  await signal_tracker.update({
    dedup_key: 'network-observer-degraded',
    is_raised,
    severity: 'medium',
    title: 'nano.community network observer is degraded',
    payload: {
      degraded_reasons: degraded.degraded_reasons,
      degraded_since_ms: degraded_state.degraded_since_ms
    }
  })
}

// The spool backlog signal: the oldest entry is older than 15 minutes.
export const SPOOL_BACKLOG_SIGNAL_SECONDS = 15 * 60

export const update_spool_backlog_signal = async ({
  signal_tracker,
  spool_status,
  last_drain_error
}) =>
  signal_tracker.update({
    dedup_key: 'network-observer-spool-backlog',
    is_raised:
      spool_status.spool_oldest_entry_age_seconds >
      SPOOL_BACKLOG_SIGNAL_SECONDS,
    severity: 'medium',
    title: 'nano.community network observer spool is not draining',
    payload: { ...spool_status, last_drain_error }
  })
