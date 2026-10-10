import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  nostr_identity_actions,
  get_nostr_identity,
  export_local_key
} from '@core/nostr-identity'
import PubkeyName from './pubkey-name'

// Shows who you act as, prompts to back up a browser-generated key, and moves
// a key between clients by export and import.
export default function IdentityBar() {
  const dispatch = useDispatch()
  const identity = useSelector(get_nostr_identity)
  const [panel, set_panel] = useState(null) // 'export' | 'import' | null
  const [import_value, set_import_value] = useState('')

  const method = identity.get('method')
  const pubkey = identity.get('pubkey')
  const needs_backup = identity.get('needs_backup')

  return (
    <div className='task-board__identity'>
      <div className='task-board__identity-line'>
        {pubkey ? (
          <span>
            Acting as <PubkeyName pubkey={pubkey} />
            {method === 'nip07'
              ? ' (browser extension)'
              : ' (key in this browser)'}
          </span>
        ) : (
          <span>
            No key yet. A nostr browser extension is used if present; otherwise
            a key is created in this browser when you first act.
          </span>
        )}
        {method !== 'nip07' && (
          <span className='task-board__identity-actions'>
            {method === 'local' && (
              <button
                onClick={() => set_panel(panel === 'export' ? null : 'export')}>
                Export key
              </button>
            )}
            <button
              onClick={() => set_panel(panel === 'import' ? null : 'import')}>
              Import key
            </button>
          </span>
        )}
      </div>
      {method === 'local' && needs_backup && panel !== 'export' && (
        <div className='task-board__notice'>
          This key exists only in this browser. Export it and keep it safe, or
          you lose this identity when browser data is cleared.{' '}
          <button onClick={() => set_panel('export')}>Back up now</button>
        </div>
      )}
      {panel === 'export' && (
        <div className='task-board__panel'>
          <div>Your secret key. Anyone holding it can act as you.</div>
          <code className='task-board__secret'>{export_local_key()}</code>
          <button
            onClick={() => {
              dispatch(nostr_identity_actions.mark_backed_up())
              set_panel(null)
            }}>
            I saved it
          </button>
        </div>
      )}
      {panel === 'import' && (
        <form
          className='task-board__panel'
          onSubmit={(event) => {
            event.preventDefault()
            dispatch(nostr_identity_actions.import_key({ value: import_value }))
            set_import_value('')
            set_panel(null)
          }}>
          <input
            type='password'
            placeholder='nsec1…'
            value={import_value}
            onChange={(event) => set_import_value(event.target.value)}
          />
          <button type='submit'>Use this key</button>
        </form>
      )}
      {identity.get('import_error') && (
        <div className='task-board__error'>{identity.get('import_error')}</div>
      )}
    </div>
  )
}
