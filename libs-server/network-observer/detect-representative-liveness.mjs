import { REPRESENTATIVE_NOT_VOTING_MINUTES } from '#common/network-event-types.mjs'
import {
  PRINCIPAL_ENTER_BASIS_POINTS,
  PRINCIPAL_LEAVE_BASIS_POINTS
} from './load-principal-representatives.mjs'

export const REPRESENTATIVE_NOT_VOTING_MS =
  REPRESENTATIVE_NOT_VOTING_MINUTES * 60 * 1000

const NETWORK_EVENT_TYPE = 'representative_not_voting'

const to_seconds = (ms) => Math.floor(ms / 1000)

// State is plain JSON so it can be saved and restored:
//   principal_accounts   accounts in the principal set
//   last_vote_at_ms      last vote seen per account, principal or not
//   open_conditions      account -> { began_at, last_vote_at, observing_since }
//                        plus recovering_since_ms once votes resume
//   observing_since_ms   when this run began watching, for warm-up
export const create_liveness_state = ({ observing_since_ms }) => ({
  principal_accounts: [],
  last_vote_at_ms: {},
  open_conditions: {},
  observing_since_ms
})

const end_condition = ({
  state,
  representative_account,
  ended_at_ms,
  evidence
}) => {
  // recovering_since_ms is detector state, not began evidence
  // eslint-disable-next-line no-unused-vars
  const { recovering_since_ms, ...opened } =
    state.open_conditions[representative_account]
  delete state.open_conditions[representative_account]
  return {
    network_event_type: NETWORK_EVENT_TYPE,
    network_event_phase: 'ended',
    representative_account,
    // the began keys win, so the ended id links to its began row
    evidence: { ...evidence, ...opened },
    observed_at: to_seconds(ended_at_ms)
  }
}

// Applies fresh weights with hysteresis. A representative that leaves ends its
// open condition and never starts a new one.
export const update_principal_set = ({
  state,
  online_weight,
  weights_by_account,
  now_ms
}) => {
  const online = BigInt(online_weight)
  const current = new Set(state.principal_accounts)
  const next = new Set()
  for (const [account, weight] of Object.entries(weights_by_account)) {
    const scaled_weight = BigInt(weight) * 10000n
    const threshold = current.has(account)
      ? PRINCIPAL_LEAVE_BASIS_POINTS
      : PRINCIPAL_ENTER_BASIS_POINTS
    if (scaled_weight >= online * threshold) next.add(account)
  }

  const network_events = []
  for (const account of current) {
    if (!next.has(account) && state.open_conditions[account]) {
      network_events.push(
        end_condition({
          state,
          representative_account: account,
          ended_at_ms: now_ms,
          evidence: { reason: 'left_principal_set' }
        })
      )
    }
  }
  state.principal_accounts = [...next].sort()
  return network_events
}

// Records one vote. An open condition ends only once the account has voted
// for a full threshold with no silence longer than the threshold, so a stalled
// node that still casts a vote every few minutes stays one open condition
// instead of a begin and end per vote. The ended event is dated to the vote
// that started the recovery.
export const record_representative_vote = ({
  state,
  representative_account,
  received_at_ms
}) => {
  const previous_vote_at_ms = state.last_vote_at_ms[representative_account]
  if (
    previous_vote_at_ms === undefined ||
    received_at_ms > previous_vote_at_ms
  ) {
    state.last_vote_at_ms[representative_account] = received_at_ms
  }
  const opened = state.open_conditions[representative_account]
  if (!opened) return []

  const is_recovery_broken =
    opened.recovering_since_ms === undefined ||
    previous_vote_at_ms === undefined ||
    received_at_ms - previous_vote_at_ms > REPRESENTATIVE_NOT_VOTING_MS
  if (is_recovery_broken) {
    opened.recovering_since_ms = received_at_ms
    return []
  }
  if (
    received_at_ms - opened.recovering_since_ms <
    REPRESENTATIVE_NOT_VOTING_MS
  )
    return []

  const recovered_at_ms = opened.recovering_since_ms
  const silent_since = opened.last_vote_at ?? opened.observing_since
  return [
    end_condition({
      state,
      representative_account,
      ended_at_ms: recovered_at_ms,
      evidence: {
        reason: 'voted',
        not_voting_seconds: to_seconds(recovered_at_ms) - silent_since,
        confirmed_at: to_seconds(received_at_ms)
      }
    })
  ]
}

// Begins a condition for each principal representative silent longer than the
// threshold. A representative never seen voting is judged only once the
// observer has watched for a full threshold, and nothing begins while the
// observer is degraded.
export const evaluate_representative_liveness = ({
  state,
  now_ms,
  is_degraded
}) => {
  if (is_degraded) return []
  const network_events = []
  const is_warmed_up =
    now_ms - state.observing_since_ms >= REPRESENTATIVE_NOT_VOTING_MS
  for (const account of state.principal_accounts) {
    if (state.open_conditions[account]) continue
    const last_vote_at_ms = state.last_vote_at_ms[account]
    const silent_since_ms = last_vote_at_ms ?? state.observing_since_ms
    if (last_vote_at_ms === undefined && !is_warmed_up) continue
    if (now_ms - silent_since_ms <= REPRESENTATIVE_NOT_VOTING_MS) continue

    // observed_at is the last vote, or the start of observation when no vote
    // has been seen.
    const began_at = to_seconds(silent_since_ms)
    const opened = {
      began_at,
      last_vote_at:
        last_vote_at_ms === undefined ? null : to_seconds(last_vote_at_ms),
      observing_since: to_seconds(state.observing_since_ms)
    }
    state.open_conditions[account] = opened
    network_events.push({
      network_event_type: NETWORK_EVENT_TYPE,
      network_event_phase: 'began',
      representative_account: account,
      evidence: {
        ...opened,
        threshold_minutes: REPRESENTATIVE_NOT_VOTING_MINUTES
      },
      observed_at: began_at
    })
  }
  return network_events
}

// The share of principal representatives seen voting within window_ms.
export const get_principal_voting_share = ({ state, now_ms, window_ms }) => {
  if (!state.principal_accounts.length) return null
  const voted_count = state.principal_accounts.filter(
    (account) =>
      now_ms - (state.last_vote_at_ms[account] ?? -Infinity) <= window_ms
  ).length
  return voted_count / state.principal_accounts.length
}

// Restores saved state. When the observer was down longer than the threshold,
// its last-vote times say nothing about the gap, so they are dropped and the
// warm-up rule applies again. Open conditions are kept: they began on evidence
// and end on sustained voting. A recovery in progress is dropped across such a
// gap, since the gap may hide silence.
export const restore_liveness_state = ({
  saved_state,
  saved_at_ms,
  now_ms
}) => {
  if (!saved_state) return create_liveness_state({ observing_since_ms: now_ms })
  const is_continuous = now_ms - saved_at_ms <= REPRESENTATIVE_NOT_VOTING_MS
  return {
    principal_accounts: saved_state.principal_accounts ?? [],
    last_vote_at_ms: is_continuous ? (saved_state.last_vote_at_ms ?? {}) : {},
    open_conditions: is_continuous
      ? (saved_state.open_conditions ?? {})
      : Object.fromEntries(
          Object.entries(saved_state.open_conditions ?? {}).map(
            // eslint-disable-next-line no-unused-vars
            ([account, { recovering_since_ms, ...opened }]) => [account, opened]
          )
        ),
    observing_since_ms: is_continuous ? saved_state.observing_since_ms : now_ms
  }
}
