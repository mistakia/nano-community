export const nostr_identity_actions = {
  NOSTR_IDENTITY_INIT: 'NOSTR_IDENTITY_INIT',
  NOSTR_IDENTITY_SET: 'NOSTR_IDENTITY_SET',
  NOSTR_IDENTITY_CREATE_KEY: 'NOSTR_IDENTITY_CREATE_KEY',
  NOSTR_IDENTITY_IMPORT_KEY: 'NOSTR_IDENTITY_IMPORT_KEY',
  NOSTR_IDENTITY_IMPORT_FAILED: 'NOSTR_IDENTITY_IMPORT_FAILED',
  NOSTR_IDENTITY_MARK_BACKED_UP: 'NOSTR_IDENTITY_MARK_BACKED_UP',
  NOSTR_IDENTITY_FORGET_KEY: 'NOSTR_IDENTITY_FORGET_KEY',
  NOSTR_IDENTITY_SET_PANEL: 'NOSTR_IDENTITY_SET_PANEL',

  init: () => ({ type: nostr_identity_actions.NOSTR_IDENTITY_INIT }),

  set: ({ method, pubkey, needs_backup = false }) => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_SET,
    payload: { method, pubkey, needs_backup }
  }),

  create_key: () => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_CREATE_KEY
  }),

  import_key: ({ value }) => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_IMPORT_KEY,
    payload: { value }
  }),

  import_failed: ({ error }) => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_IMPORT_FAILED,
    payload: { error }
  }),

  mark_backed_up: () => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_MARK_BACKED_UP
  }),

  forget_key: () => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_FORGET_KEY
  }),

  // The identity panel: 'join' | 'import' | 'account' | 'export' | null
  set_panel: (panel) => ({
    type: nostr_identity_actions.NOSTR_IDENTITY_SET_PANEL,
    payload: { panel }
  })
}
