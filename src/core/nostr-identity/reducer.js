import { Map } from 'immutable'

import { nostr_identity_actions } from './actions'

const initial_state = new Map({
  method: null, // 'nip07' | 'local' | null
  pubkey: null,
  needs_backup: false,
  import_error: null,
  return_to: null
})

export function nostr_identity_reducer(
  state = initial_state,
  { payload, type }
) {
  switch (type) {
    case nostr_identity_actions.NOSTR_IDENTITY_SET:
      return state.merge({
        method: payload.method,
        pubkey: payload.pubkey,
        needs_backup: payload.needs_backup,
        import_error: null
      })

    case nostr_identity_actions.NOSTR_IDENTITY_IMPORT_FAILED:
      return state.set('import_error', payload.error)

    case nostr_identity_actions.NOSTR_IDENTITY_MARK_BACKED_UP:
      return state.set('needs_backup', false)

    case nostr_identity_actions.NOSTR_IDENTITY_SET_RETURN_TO:
      return state.merge({ return_to: payload.path, import_error: null })

    default:
      return state
  }
}
