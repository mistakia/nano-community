import fs from 'fs'
import { monitorEventLoopDelay } from 'perf_hooks'
import debug from 'debug'
import NanoNode, { NanoConstants } from 'nano-node-light'

import config from '#config'
import db from '#db'
import report_job from '#libs-server/report-job.mjs'
import create_network_event_spool from '#libs-server/network-observer/network-event-spool.mjs'
import { load_principal_inputs_with_cache } from '#libs-server/network-observer/load-principal-representatives.mjs'
import {
  REPRESENTATIVE_NOT_VOTING_MS,
  record_representative_vote,
  evaluate_representative_liveness,
  update_principal_set,
  get_principal_voting_share,
  restore_liveness_state
} from '#libs-server/network-observer/detect-representative-liveness.mjs'
import {
  CRAWLER_ROUND_MINUTES,
  create_crawler_state,
  record_direct_vote,
  evaluate_peer_hosting,
  crawl_representative_peers
} from '#libs-server/network-observer/crawl-representative-peers.mjs'
import {
  create_fork_index,
  record_published_block,
  record_final_vote,
  get_confirmed_pair,
  prune_fork_index,
  get_fork_index_size
} from '#libs-server/network-observer/index-block-forks.mjs'
import {
  create_vote_conflict_state,
  check_vote_for_conflicts,
  prune_vote_conflict_state
} from '#libs-server/network-observer/detect-representative-votes-conflicting.mjs'
import {
  create_minority_final_vote_state,
  record_principal_final_vote,
  settle_minority_final_votes,
  get_minority_final_vote_counts
} from '#libs-server/network-observer/count-minority-final-votes.mjs'
import {
  create_signature_state,
  record_invalid_signature,
  flush_signature_windows
} from '#libs-server/network-observer/detect-peer-signature-invalid.mjs'
import {
  ensure_data_directory,
  save_observer_state,
  load_observer_state,
  evaluate_degraded,
  build_coverage_window,
  create_signal_tracker,
  update_degraded_signal,
  update_spool_backlog_signal
} from '#libs-server/network-observer/network-observer-state.mjs'

const log = debug('network-observer')
debug.enable(process.env.DEBUG || 'network-observer*')

const DEFAULT_DATA_DIRECTORY = '/var/lib/nano-community/network-observer'
const MINUTE_MS = 60 * 1000
const HEARTBEAT_MINUTES = 5
const PRINCIPAL_REFRESH_MINUTES = 10
const BOOTSTRAP_PEER_LOOKBACK_SECONDS = 24 * 60 * 60
const NANO_PROTOCOL_PORT = 7075

// --dry-run observes and spools into its own directory but never drains,
// signals or reports, so a soak writes nothing outside that directory. It
// appends each minute's record to minutes.ndjson there. --duration-hours N
// stops the process after N hours.
const is_dry_run = process.argv.includes('--dry-run')
const duration_argument_index = process.argv.indexOf('--duration-hours')
const duration_hours =
  duration_argument_index === -1
    ? null
    : Number(process.argv[duration_argument_index + 1])

const configured_data_directory =
  config.network_observer_data_directory || DEFAULT_DATA_DIRECTORY
const data_directory = is_dry_run
  ? `${configured_data_directory}-dry-run`
  : configured_data_directory
const minutes_file = `${data_directory}/minutes.ndjson`
const { spool_directory, state_file, principal_cache_file } =
  ensure_data_directory({ data_directory })
const bootstrap_peers_cache_file = `${data_directory}/bootstrap-peers.json`

// Representative peers seen in telemetry over the last day, on the protocol
// port: telemetry records the port the peer connected from, which is
// ephemeral. Kept on disk so a restart during a database outage can still
// join the network. peering.nano.org refuses connections, so there is no
// other seed.
const load_bootstrap_peers = async () => {
  try {
    const rows = await db('representatives_telemetry')
      .where(
        'observed_at',
        '>',
        new Date(Date.now() - BOOTSTRAP_PEER_LOOKBACK_SECONDS * 1000)
      )
      .distinct('address')
    const bootstrap_peers = rows.map(
      ({ address }) => `[${address.trim()}]:${NANO_PROTOCOL_PORT}`
    )
    if (bootstrap_peers.length) {
      fs.writeFileSync(
        bootstrap_peers_cache_file,
        JSON.stringify(bootstrap_peers)
      )
      return bootstrap_peers
    }
  } catch (error) {
    log(`bootstrap peer load failed, using the cached list: ${error.message}`)
  }
  return JSON.parse(fs.readFileSync(bootstrap_peers_cache_file, 'utf8'))
}

const main = async () => {
  const started_at_ms = Date.now()
  const spool = create_network_event_spool({ spool_directory })
  const saved_state = load_observer_state({ state_file })

  const liveness = restore_liveness_state({
    saved_state: saved_state?.liveness,
    saved_at_ms: saved_state?.saved_at_ms,
    now_ms: started_at_ms
  })
  const crawler = saved_state?.crawler ?? create_crawler_state()
  const signatures = saved_state?.signatures ?? create_signature_state()
  const degraded_state = { degraded_since_ms: null }
  const signal_tracker = create_signal_tracker({
    raised_keys: saved_state?.raised_signal_keys
  })
  const fork_index = create_fork_index()
  const vote_conflicts = create_vote_conflict_state()
  const minority_final_votes = create_minority_final_vote_state()

  const event_counts = {}
  const emit = (network_events) => {
    for (const network_event of network_events) {
      spool.append_network_event(network_event)
      event_counts[network_event.network_event_type] =
        (event_counts[network_event.network_event_type] ?? 0) + 1
    }
  }

  // Account -> the same string, so a lookup also interns the account for the
  // minority-vote voter sets.
  const principal_accounts = () =>
    new Map(liveness.principal_accounts.map((account) => [account, account]))
  let principal_set = principal_accounts()

  const refresh_principal_set = async () => {
    const principal_inputs = await load_principal_inputs_with_cache({
      cache_file: principal_cache_file,
      now_seconds: Math.floor(Date.now() / 1000)
    })
    if (!principal_inputs) {
      log('no principal inputs from the database or the cache')
      return
    }
    emit(
      update_principal_set({
        state: liveness,
        online_weight: principal_inputs.online_weight,
        weights_by_account: principal_inputs.weights_by_account,
        behind_accounts: principal_inputs.behind_accounts,
        now_ms: Date.now()
      })
    )
    principal_set = principal_accounts()
  }
  await refresh_principal_set()

  const node = new NanoNode({
    network: NanoConstants.NETWORK.LIVE,
    bootstrap_peers: await load_bootstrap_peers()
  })

  node.on('vote', (vote) => {
    emit(
      record_representative_vote({
        state: liveness,
        representative_account: vote.representative_account,
        received_at_ms: vote.received_at_ms
      })
    )
    record_direct_vote({ state: crawler, vote })
    if (vote.is_duplicate) return
    if (vote.is_final) {
      for (const block_hash of vote.block_hashes) {
        record_final_vote({
          fork_index,
          block_hash,
          received_at_ms: vote.received_at_ms
        })
      }
    }
    // Conflicts and minority votes are judged for principal representatives
    // only, which bounds their state.
    const principal_account = principal_set.get(vote.representative_account)
    if (!principal_account) return
    if (vote.is_final) {
      record_principal_final_vote({
        state: minority_final_votes,
        vote,
        representative_account: principal_account
      })
    }
    emit(check_vote_for_conflicts({ state: vote_conflicts, fork_index, vote }))
  })

  node.on('block', (block) => {
    if (block.is_duplicate) return
    emit(record_published_block({ fork_index, block }))
  })

  node.on('invalid_signature', (invalid_signature) =>
    emit(record_invalid_signature({ state: signatures, invalid_signature }))
  )

  node.on('error', (error) => log(`node error: ${error.message}`))

  // One histogram per reader: the heartbeat resets its own every 5 minutes,
  // and the minute record its own every minute.
  const event_loop_delay = monitorEventLoopDelay({ resolution: 10 })
  event_loop_delay.enable()
  const minute_event_loop_delay = monitorEventLoopDelay({ resolution: 10 })
  minute_event_loop_delay.enable()

  let is_degraded = true
  let last_degraded = { is_degraded: true, degraded_reasons: ['starting'] }
  let coverage_began_at_ms = started_at_ms
  let last_drain_error = null
  let last_crawl = null

  const save_state = (now_ms) =>
    save_observer_state({
      state_file,
      observer_state: {
        liveness,
        crawler,
        signatures,
        raised_signal_keys: signal_tracker.get_raised_keys()
      },
      now_ms
    })

  const drain_spool = async () => {
    if (is_dry_run) return
    try {
      await spool.drain()
      last_drain_error = null
    } catch (error) {
      last_drain_error = error.message
      log(`spool drain failed: ${error.message}`)
    }
  }

  const get_principal_share = (now_ms) =>
    get_principal_voting_share({
      state: liveness,
      now_ms,
      window_ms: REPRESENTATIVE_NOT_VOTING_MS
    })

  // Once a minute: judge liveness, close the minute's coverage, save state,
  // rotate and drain the spool.
  const run_minute = async () => {
    const now_ms = Date.now()
    const peer_count = node.get_peers().length
    const principal_voting_share = get_principal_share(now_ms)
    const degraded = evaluate_degraded({ peer_count, principal_voting_share })
    // A minute is covered only when the observer was healthy at both ends.
    const was_covered = !is_degraded && !degraded.is_degraded
    is_degraded = degraded.is_degraded
    last_degraded = degraded

    emit(
      evaluate_representative_liveness({ state: liveness, now_ms, is_degraded })
    )
    emit(flush_signature_windows({ state: signatures, now_ms }))
    prune_fork_index({ fork_index, now_ms })
    prune_vote_conflict_state({ state: vote_conflicts, now_ms })
    settle_minority_final_votes({
      state: minority_final_votes,
      fork_index,
      principal_count: liveness.principal_accounts.length,
      is_degraded,
      now_ms
    })

    if (was_covered) {
      spool.append_coverage_window(
        build_coverage_window({
          began_at_ms: coverage_began_at_ms,
          ended_at_ms: now_ms
        })
      )
    }
    coverage_began_at_ms = now_ms

    save_state(now_ms)
    spool.rotate()
    await drain_spool()
    if (!is_dry_run) {
      await update_degraded_signal({
        signal_tracker,
        degraded_state,
        degraded,
        now_ms
      })
    }

    const minute_record = {
      type: 'minute',
      at_ms: now_ms,
      peer_count,
      principal_count: liveness.principal_accounts.length,
      principal_voting_share,
      degraded_reasons: degraded.degraded_reasons,
      open_not_voting_count: Object.keys(liveness.open_conditions).length,
      ...spool.get_status(),
      ...get_fork_index_size({ fork_index }),
      minority_final_votes: get_minority_final_vote_counts({
        state: minority_final_votes
      }),
      event_counts,
      event_loop_lag_p99_ms: minute_event_loop_delay.percentile(99) / 1e6,
      event_loop_lag_max_ms: minute_event_loop_delay.max / 1e6,
      rss_mb: Math.round(process.memoryUsage().rss / 1e6)
    }
    minute_event_loop_delay.reset()
    log(JSON.stringify(minute_record))
    if (is_dry_run) {
      fs.appendFileSync(minutes_file, JSON.stringify(minute_record) + '\n')
    }
  }

  const run_crawl = async () => {
    const now_ms = Date.now()
    const hash_root_pair = get_confirmed_pair({ fork_index, now_ms })
    if (hash_root_pair) {
      const crawl = await crawl_representative_peers({ node, hash_root_pair })
      for (const reply of crawl.replies) {
        for (const vote of reply.votes)
          record_direct_vote({ state: crawler, vote })
      }
      last_crawl = {
        crawled_at_ms: now_ms,
        asked_peer_count: crawl.asked_peer_count,
        replied_peer_count: crawl.replied_peer_count
      }
      log(JSON.stringify({ type: 'crawl', ...last_crawl }))
    } else {
      log('no confirmed hash and root pair to crawl with yet')
    }
    emit(
      evaluate_peer_hosting({ state: crawler, now_ms: Date.now(), is_degraded })
    )
  }

  const send_heartbeat = async () => {
    if (is_dry_run) return
    const spool_status = spool.get_status()
    await update_spool_backlog_signal({
      signal_tracker,
      spool_status,
      last_drain_error
    })
    const statistics = node.get_statistics()
    await report_job({
      job_id: 'network-observer',
      outcome: 'alive',
      schedule: `${HEARTBEAT_MINUTES}m`,
      payload: {
        ...spool_status,
        last_drain_error,
        peer_count: statistics.handshaken_peer_count,
        principal_count: liveness.principal_accounts.length,
        principal_voting_share: get_principal_share(Date.now()),
        degraded_reasons: last_degraded.degraded_reasons,
        last_crawl,
        votes_verified_count: statistics.votes_verified_count,
        invalid_signature_count: statistics.invalid_signature_count,
        event_counts,
        event_loop_lag_p99_ms: event_loop_delay.percentile(99) / 1e6,
        rss_mb: Math.round(process.memoryUsage().rss / 1e6)
      }
    })
    event_loop_delay.reset()
  }

  // A timer's failure is logged and the loop carries on; the heartbeat and
  // the backlog signal are what show a stuck observer.
  const every = (interval_ms, task) =>
    setInterval(() => {
      task().catch((error) => log(`task failed: ${error.stack}`))
    }, interval_ms)

  const timers = [
    every(MINUTE_MS, run_minute),
    every(CRAWLER_ROUND_MINUTES * MINUTE_MS, run_crawl),
    every(HEARTBEAT_MINUTES * MINUTE_MS, send_heartbeat),
    every(PRINCIPAL_REFRESH_MINUTES * MINUTE_MS, refresh_principal_set)
  ]

  // Drain whatever an earlier run left before the first minute closes.
  await drain_spool()

  let is_stopping = false
  const stop = async (signal) => {
    if (is_stopping) return
    is_stopping = true
    log(`stopping on ${signal}`)
    for (const timer of timers) clearInterval(timer)
    node.stop()
    save_state(Date.now())
    spool.rotate()
    await drain_spool()
    await db.destroy()
    process.exit(0)
  }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))
  if (duration_hours) {
    setTimeout(() => stop('duration'), duration_hours * 60 * 60 * 1000)
  }

  log(
    `observing mainnet${is_dry_run ? ' (dry run)' : ''} with ${liveness.principal_accounts.length} principal representatives, data in ${data_directory}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
