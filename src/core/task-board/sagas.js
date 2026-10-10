import { eventChannel } from 'redux-saga'
import {
  takeLatest,
  takeEvery,
  fork,
  call,
  put,
  select,
  take,
  cancel,
  cancelled
} from 'redux-saga/effects'
import { SimplePool } from 'nostr-tools'

import {
  TASK_BOARD_KINDS,
  TRIAGE_SET_D_TAG,
  CLAIM_LIFETIME_SECONDS,
  format_board_address,
  build_task_claim
} from '#common/task-board/index.mjs'
import {
  nostr_identity_actions,
  get_nostr_identity,
  sign_event
} from '@core/nostr-identity'
import { generate_local_key } from '@core/nostr-identity/signer'
import { task_board_actions } from './actions'
import { get_task_board, get_task_board_state } from './selectors'

const BATCH_MS = 200
const EOSE_MAX_WAIT_MS = 8000
const STATUS_KINDS = [
  TASK_BOARD_KINDS.status_open,
  TASK_BOARD_KINDS.status_resolved,
  TASK_BOARD_KINDS.status_closed,
  TASK_BOARD_KINDS.status_draft
]

let pool = null
const get_pool = () => {
  if (!pool) pool = new SimplePool()
  return pool
}

const board_filters = (board) => {
  const address = format_board_address(board)
  return [
    {
      kinds: [TASK_BOARD_KINDS.repository_announcement],
      authors: [board.owner_pubkey],
      '#d': [board.d_tag]
    },
    { kinds: [TASK_BOARD_KINDS.issue], '#a': [address] },
    { kinds: STATUS_KINDS, '#a': [address] },
    { kinds: [TASK_BOARD_KINDS.claim], '#a': [address] },
    { kinds: [TASK_BOARD_KINDS.follow_set], '#d': [TRIAGE_SET_D_TAG] }
  ]
}

// Events that reference issues without the board tag: labels, statuses from
// other NIP-34 clients, deletions, and comments.
const issue_filters = (issue_ids) => [
  {
    kinds: [
      TASK_BOARD_KINDS.label,
      TASK_BOARD_KINDS.deletion_request,
      ...STATUS_KINDS
    ],
    '#e': issue_ids
  },
  { kinds: [TASK_BOARD_KINDS.comment], '#E': issue_ids }
]

// Emits { events } in batches and { eose } once every filter reached EOSE.
function create_subscription_channel({ relays, filters }) {
  return eventChannel((emit) => {
    let buffer = []
    let timer = null
    let eose_count = 0
    const flush = () => {
      timer = null
      if (buffer.length) emit({ events: buffer })
      buffer = []
    }
    const subscriptions = filters.map((filter) =>
      get_pool().subscribeMany(relays, filter, {
        maxWait: EOSE_MAX_WAIT_MS,
        onevent: (event) => {
          buffer.push(event)
          if (!timer) timer = setTimeout(flush, BATCH_MS)
        },
        oneose: () => {
          eose_count += 1
          if (eose_count === filters.length) {
            flush()
            emit({ eose: true })
          }
        }
      })
    )
    return () => {
      if (timer) clearTimeout(timer)
      for (const subscription of subscriptions) subscription.close()
    }
  })
}

function* run_subscription({ relays, filters, on_eose }) {
  const channel = yield call(create_subscription_channel, { relays, filters })
  try {
    for (;;) {
      const message = yield take(channel)
      if (message.events) {
        yield put(
          task_board_actions.events_received({ events: message.events })
        )
      }
      if (message.eose && on_eose) yield call(on_eose)
    }
  } finally {
    if (yield cancelled()) channel.close()
  }
}

async function query_profiles({ relays, pubkeys }) {
  return get_pool().querySync(
    relays,
    { kinds: [TASK_BOARD_KINDS.profile], authors: pubkeys },
    { maxWait: EOSE_MAX_WAIT_MS }
  )
}

// Names are cosmetic: a failed lookup leaves the npub showing.
function* load_profiles({ relays, pubkeys }) {
  try {
    const events = yield call(query_profiles, { relays, pubkeys })
    if (events.length) {
      yield put(task_board_actions.events_received({ events }))
    }
  } catch {}
}

// Looks up the kind 0 profile of every author on the board, and of the
// visitor's own key, once each.
function* follow_profiles({ relays }) {
  const requested = new Set()
  for (;;) {
    const events = (yield select(get_task_board)).get('events')
    const pubkeys = new Set()
    for (const event of events.values()) pubkeys.add(event.pubkey)
    const own_pubkey = (yield select(get_nostr_identity)).get('pubkey')
    if (own_pubkey) pubkeys.add(own_pubkey)
    const fresh = [...pubkeys].filter((pubkey) => !requested.has(pubkey))
    if (fresh.length) {
      for (const pubkey of fresh) requested.add(pubkey)
      yield fork(load_profiles, { relays, pubkeys: fresh })
    }
    yield take([
      task_board_actions.TASK_BOARD_EVENTS_RECEIVED,
      task_board_actions.TASK_BOARD_PUBLISH_FULFILLED,
      nostr_identity_actions.NOSTR_IDENTITY_SET
    ])
  }
}

// Follows the issue set: whenever new issues arrive, re-subscribe to the
// events that reference them.
function* follow_issues({ relays }) {
  let subscribed_key = null
  let task = null
  let loaded = false
  for (;;) {
    const state = yield select(get_task_board_state)
    const issue_ids = state ? Object.keys(state.tasks).sort() : []
    const key = issue_ids.join(',')
    if (key !== subscribed_key) {
      subscribed_key = key
      if (task) yield cancel(task)
      if (issue_ids.length) {
        task = yield fork(run_subscription, {
          relays,
          filters: issue_filters(issue_ids),
          on_eose: function* () {
            if (!loaded) {
              loaded = true
              yield put(task_board_actions.loaded())
            }
          }
        })
      } else if (!loaded) {
        loaded = true
        yield put(task_board_actions.loaded())
      }
    }
    yield take([
      task_board_actions.TASK_BOARD_EVENTS_RECEIVED,
      task_board_actions.TASK_BOARD_PUBLISH_FULFILLED
    ])
  }
}

export function* init({ payload }) {
  const { board, relays } = payload
  if (!board) {
    yield put(task_board_actions.loaded())
    return
  }
  let board_loaded = false
  yield fork(follow_profiles, { relays })
  yield fork(run_subscription, {
    relays,
    filters: board_filters(board),
    on_eose: function* () {
      if (board_loaded) return
      board_loaded = true
      yield fork(follow_issues, { relays })
    }
  })
}

function* ensure_signer() {
  let identity = yield select(get_nostr_identity)
  if (!identity.get('method')) {
    const pubkey = generate_local_key()
    yield put(
      nostr_identity_actions.set({
        method: 'local',
        pubkey,
        needs_backup: true
      })
    )
    identity = yield select(get_nostr_identity)
  }
  return identity
}

async function publish_to_relays({ relays, event }) {
  const results = await Promise.allSettled(get_pool().publish(relays, event))
  if (!results.some((result) => result.status === 'fulfilled')) {
    const reasons = results.map((result) => String(result.reason)).join('; ')
    throw new Error(`no relay accepted the event: ${reasons}`)
  }
  return results
}

// A claim replaces the claimant's previous one only if it is strictly newer;
// on equal created_at the lowest id wins, so a release signed in the same
// second as a renewal could lose. Date it after the previous claim.
function* order_after_previous_claim({ template, pubkey }) {
  if (template.kind !== TASK_BOARD_KINDS.claim) return template
  const issue_id = template.tags.find((tag) => tag[0] === 'd')[1]
  const state = yield select(get_task_board_state)
  const previous = state?.tasks[issue_id]?.claims.find(
    (claim) => claim.pubkey === pubkey
  )
  if (!previous || previous.created_at < template.created_at) return template
  const created_at = previous.created_at + 1
  return {
    ...template,
    created_at,
    tags: template.tags.map((tag) =>
      tag[0] === 'expiration'
        ? ['expiration', String(created_at + CLAIM_LIFETIME_SECONDS)]
        : tag
    )
  }
}

function* sign_and_publish({ template }) {
  const identity = yield call(ensure_signer)
  const { relays } = (yield select(get_task_board)).toJS()
  const ordered = yield call(order_after_previous_claim, {
    template,
    pubkey: identity.get('pubkey')
  })
  const event = yield call(sign_event, {
    method: identity.get('method'),
    template: ordered
  })
  yield call(publish_to_relays, { relays, event })
  return event
}

// A claim lapses unless its claimant acts on the task, so any action by a
// claimant re-signs their active claim.
function* renew_claim({ issue_id, pubkey }) {
  const state = yield select(get_task_board_state)
  const task = state?.tasks[issue_id]
  if (!task || !task.active_claimants.includes(pubkey)) return
  const { board } = (yield select(get_task_board)).toJS()
  const event = yield call(sign_and_publish, {
    template: build_task_claim({ board, issue: task })
  })
  yield put(
    task_board_actions.publish_fulfilled({ key: 'claim-renewal', event })
  )
}

export function* publish({ payload }) {
  const { key, build, issue_id, on_published } = payload
  yield put(task_board_actions.publish_pending({ key }))
  try {
    const { board } = (yield select(get_task_board)).toJS()
    const template = build(board)
    const event = yield call(sign_and_publish, { template })
    // Renew before reporting done, so the UI cannot start a claim change
    // that races the renewal.
    if (issue_id && event.kind !== TASK_BOARD_KINDS.claim) {
      yield call(renew_claim, { issue_id, pubkey: event.pubkey })
    }
    yield put(task_board_actions.publish_fulfilled({ key, event }))
    if (on_published) yield call(on_published, event)
  } catch (error) {
    yield put(task_board_actions.publish_failed({ key, error: error.message }))
  }
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watch_init() {
  yield takeLatest(task_board_actions.TASK_BOARD_INIT, init)
}

export function* watch_publish() {
  yield takeEvery(task_board_actions.TASK_BOARD_PUBLISH, publish)
}

//= ====================================
//  ROOT
// -------------------------------------

export const task_board_sagas = [fork(watch_init), fork(watch_publish)]
