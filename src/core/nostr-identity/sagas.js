import { takeLatest, fork, call, put, delay } from 'redux-saga/effects'

import { nostr_identity_actions } from './actions'
import {
  get_nip07,
  read_local_secret_key,
  get_signer_pubkey,
  generate_local_key,
  import_local_key,
  is_local_key_backed_up,
  mark_local_key_backed_up,
  forget_local_key
} from './signer'

// Extensions inject window.nostr after page scripts start, so look twice.
export function* init() {
  for (const wait_ms of [0, 800]) {
    yield delay(wait_ms)
    if (get_nip07()) {
      try {
        const pubkey = yield call(get_signer_pubkey, 'nip07')
        yield put(nostr_identity_actions.set({ method: 'nip07', pubkey }))
        return
      } catch (error) {
        break // the user declined the extension; fall back to a local key
      }
    }
  }
  if (read_local_secret_key()) {
    const pubkey = yield call(get_signer_pubkey, 'local')
    yield put(
      nostr_identity_actions.set({
        method: 'local',
        pubkey,
        needs_backup: !is_local_key_backed_up()
      })
    )
  }
}

export function* generate_key() {
  const pubkey = generate_local_key()
  yield put(
    nostr_identity_actions.set({ method: 'local', pubkey, needs_backup: true })
  )
}

export function* import_key({ payload }) {
  try {
    const pubkey = import_local_key(payload.value)
    yield put(nostr_identity_actions.set({ method: 'local', pubkey }))
  } catch (error) {
    yield put(nostr_identity_actions.import_failed({ error: error.message }))
  }
}

export function* mark_backed_up() {
  yield call(mark_local_key_backed_up)
}

export function* forget_key() {
  forget_local_key()
  yield put(nostr_identity_actions.set({ method: null, pubkey: null }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function* watch_init() {
  yield takeLatest(nostr_identity_actions.NOSTR_IDENTITY_INIT, init)
}

export function* watch_generate_key() {
  yield takeLatest(
    nostr_identity_actions.NOSTR_IDENTITY_GENERATE_KEY,
    generate_key
  )
}

export function* watch_import_key() {
  yield takeLatest(nostr_identity_actions.NOSTR_IDENTITY_IMPORT_KEY, import_key)
}

export function* watch_mark_backed_up() {
  yield takeLatest(
    nostr_identity_actions.NOSTR_IDENTITY_MARK_BACKED_UP,
    mark_backed_up
  )
}

export function* watch_forget_key() {
  yield takeLatest(nostr_identity_actions.NOSTR_IDENTITY_FORGET_KEY, forget_key)
}

//= ====================================
//  ROOT
// -------------------------------------

export const nostr_identity_sagas = [
  fork(watch_init),
  fork(watch_generate_key),
  fork(watch_import_key),
  fork(watch_mark_backed_up),
  fork(watch_forget_key)
]
