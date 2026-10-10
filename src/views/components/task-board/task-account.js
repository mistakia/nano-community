import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Button from '@mui/material/Button'
import { nip19 } from 'nostr-tools'

import {
  nostr_identity_actions,
  get_nostr_identity,
  export_local_key
} from '@core/nostr-identity'
import PubkeyName from './pubkey-name'
import { use_task_board_links } from './task-board-links'

function ImportKey() {
  const dispatch = useDispatch()
  const [value, set_value] = useState('')
  return (
    <form
      className='task-account__form'
      onSubmit={(event) => {
        event.preventDefault()
        dispatch(nostr_identity_actions.import_key({ value }))
        set_value('')
      }}>
      <label htmlFor='task-account-key'>
        Paste your secret key. It stays in this browser.
      </label>
      <input
        id='task-account-key'
        type='password'
        autoFocus
        placeholder='nsec1…'
        value={value}
        onChange={(event) => set_value(event.target.value)}
      />
      <div>
        <Button variant='outlined' type='submit' disabled={!value.trim()}>
          Use this key
        </Button>
      </div>
    </form>
  )
}

// Everything about the key you post with: getting one, saving it, and
// bringing one you already have.
export default function TaskAccount() {
  const dispatch = useDispatch()
  const { Link, board_path, navigate } = use_task_board_links()
  const identity = useSelector(get_nostr_identity)
  const [importing, set_importing] = useState(false)
  const [showing_key, set_showing_key] = useState(false)

  const method = identity.get('method')
  const pubkey = identity.get('pubkey')
  const needs_backup = identity.get('needs_backup')
  const return_to = identity.get('return_to')

  // Joining from a task or the file page returns you there.
  const had_key = useRef(Boolean(pubkey))
  useEffect(() => {
    if (pubkey && !had_key.current && return_to && navigate) {
      dispatch(nostr_identity_actions.set_return_to(null))
      navigate(return_to)
    }
    had_key.current = Boolean(pubkey)
  }, [pubkey])

  const back = return_to || board_path()

  return (
    <div className='task-detail task-account'>
      <div className='task-detail__top'>
        <Link to={back}>← Back</Link>
      </div>

      {!pubkey && (
        <>
          <h1 className='task-detail__subject'>Join in</h1>
          <p>
            File tasks, work on them and comment, with no account or email. This
            browser keeps a key that signs what you post.
          </p>
          <div className='task-detail__buttons'>
            <Button
              variant='outlined'
              onClick={() => dispatch(nostr_identity_actions.create_key())}>
              Get started
            </Button>
          </div>
          <p className='task-account__fine'>
            A nostr browser extension, if you have one, is used instead.{' '}
            {!importing && (
              <a
                href='#'
                onClick={(event) => {
                  event.preventDefault()
                  set_importing(true)
                }}>
                I have a nostr key
              </a>
            )}
          </p>
          {importing && <ImportKey />}
        </>
      )}

      {pubkey && (
        <>
          <h1 className='task-detail__subject'>
            <PubkeyName pubkey={pubkey} />
          </h1>
          <p className='task-account__npub'>{nip19.npubEncode(pubkey)}</p>
          {method === 'nip07' && (
            <p>You post with the key in your browser extension.</p>
          )}

          {method === 'local' && (
            <section className='task-section'>
              <h3 className='task-section__title'>
                {needs_backup ? 'Save your key' : 'Your key'}
              </h3>
              <p>
                {needs_backup
                  ? 'Your key is only in this browser. Save it to keep your name if browser data is cleared, or to post from another device.'
                  : 'Your key lives in this browser.'}
              </p>
              {showing_key ? (
                <>
                  <p>
                    Copy it somewhere safe, like a password manager. Anyone who
                    has it can post as you.
                  </p>
                  <p className='task-account__secret'>{export_local_key()}</p>
                  {needs_backup && (
                    <Button
                      variant='outlined'
                      onClick={() => {
                        dispatch(nostr_identity_actions.mark_backed_up())
                        set_showing_key(false)
                      }}>
                      I saved it
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant='outlined'
                  onClick={() => set_showing_key(true)}>
                  Show my key
                </Button>
              )}
            </section>
          )}

          {method === 'local' && !needs_backup && (
            <section className='task-section'>
              <h3 className='task-section__title'>Use a different key</h3>
              {importing ? (
                <ImportKey />
              ) : (
                <Button variant='outlined' onClick={() => set_importing(true)}>
                  Bring another key
                </Button>
              )}
            </section>
          )}
        </>
      )}

      {identity.get('import_error') && (
        <div className='task-board__error'>{identity.get('import_error')}</div>
      )}
    </div>
  )
}
