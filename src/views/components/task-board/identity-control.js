import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { nip19 } from 'nostr-tools'

import {
  nostr_identity_actions,
  get_nostr_identity,
  export_local_key
} from '@core/nostr-identity'
import PubkeyName from './pubkey-name'

// The one place a visitor meets keys. Collapsed it is a "Join in" button or
// the name you act as; opened it explains just enough for the step at hand.
export default function IdentityControl() {
  const dispatch = useDispatch()
  const identity = useSelector(get_nostr_identity)
  const [import_value, set_import_value] = useState('')

  const method = identity.get('method')
  const pubkey = identity.get('pubkey')
  const needs_backup = identity.get('needs_backup')
  const panel = identity.get('panel')
  const set_panel = (next) => dispatch(nostr_identity_actions.set_panel(next))
  const toggle = (next) => set_panel(panel ? null : next)

  return (
    <div className='task-identity'>
      {pubkey ? (
        <button
          className='task-identity__toggle'
          aria-expanded={Boolean(panel)}
          onClick={() => toggle('account')}>
          {needs_backup && (
            <span className='task-identity__dot' title='Not saved yet' />
          )}
          <PubkeyName pubkey={pubkey} />
        </button>
      ) : (
        <button
          className='task-identity__toggle task-identity__toggle--join'
          aria-expanded={Boolean(panel)}
          onClick={() => toggle('join')}>
          Join in
        </button>
      )}

      {panel && (
        <div className='task-identity__panel'>
          {panel === 'join' && (
            <>
              <p>
                File tasks, work on them and comment, with no account or email.
                This browser keeps a key that signs what you post.
              </p>
              <div className='task-identity__actions'>
                <button
                  className='task-button--primary'
                  onClick={() => dispatch(nostr_identity_actions.create_key())}>
                  Get started
                </button>
                <button onClick={() => set_panel('import')}>
                  I have a nostr key
                </button>
              </div>
              <p className='task-identity__fine'>
                A nostr browser extension, if you have one, is used instead.
              </p>
            </>
          )}

          {panel === 'import' && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                dispatch(
                  nostr_identity_actions.import_key({ value: import_value })
                )
                set_import_value('')
              }}>
              <p>Paste your secret key. It stays in this browser.</p>
              <input
                type='password'
                autoFocus
                placeholder='nsec1…'
                value={import_value}
                onChange={(event) => set_import_value(event.target.value)}
              />
              <div className='task-identity__actions'>
                <button
                  type='submit'
                  className='task-button--primary'
                  disabled={!import_value.trim()}>
                  Use this key
                </button>
                <button type='button' onClick={() => set_panel(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {panel === 'account' && (
            <>
              <p>
                You post as <PubkeyName pubkey={pubkey} />
                {method === 'nip07' && ', signed by your browser extension'}.
              </p>
              <code className='task-identity__npub'>
                {nip19.npubEncode(pubkey)}
              </code>
              {method === 'local' && needs_backup && (
                <p className='task-identity__warning'>
                  Your key is only in this browser. Save it to keep your name if
                  browser data is cleared, or to use it elsewhere.
                </p>
              )}
              {method === 'local' && (
                <div className='task-identity__actions'>
                  <button
                    className={needs_backup ? 'task-button--primary' : ''}
                    onClick={() => set_panel('export')}>
                    Save my key
                  </button>
                  {!needs_backup && (
                    <button onClick={() => set_panel('import')}>
                      Use a different key
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {panel === 'export' && (
            <>
              <p>
                Copy this somewhere safe, like a password manager. Anyone who
                has it can post as you.
              </p>
              <code className='task-identity__secret'>
                {export_local_key()}
              </code>
              <div className='task-identity__actions'>
                <button
                  className='task-button--primary'
                  onClick={() =>
                    dispatch(nostr_identity_actions.mark_backed_up())
                  }>
                  I saved it
                </button>
                <button onClick={() => set_panel('account')}>Back</button>
              </div>
            </>
          )}

          {identity.get('import_error') && (
            <div className='task-board__error'>
              {identity.get('import_error')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
