import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import Button from '@mui/material/Button'
import { nip19 } from 'nostr-tools'

import {
  KEY_RELATION_COUNTERPARTS,
  edit_key_relation
} from '#common/task-board/index.mjs'
import {
  task_board_actions,
  get_task_board,
  get_task_board_state
} from '@core/task-board'
import PubkeyName from './pubkey-name'

const PUBLISH_KEY = 'key-properties'

// One module per relation role. A new property is a new entry here, plus
// its role in the protocol's key properties table.
const RELATION_PROPERTIES = [
  {
    role: 'acts_for',
    label: 'Acts for',
    empty: 'This key does not act on behalf of another key.',
    add_label: 'Add a key this one acts for',
    help: 'For an agent or a second key of yours. The other key confirms it.'
  },
  {
    role: 'delegates_to',
    label: 'Acting for you',
    empty: 'No other key acts on your behalf.',
    add_label: 'Add a key that acts for you',
    help: 'For example your agent. It confirms by stating it acts for you.'
  }
]

const to_pubkey = (value) => {
  const input = String(value || '').trim()
  if (/^[0-9a-f]{64}$/i.test(input)) return input.toLowerCase()
  const decoded = nip19.decode(input)
  if (decoded.type !== 'npub') throw new Error('enter an npub')
  return decoded.data
}

function AddRelation({ label, help, on_add }) {
  const [open, set_open] = useState(false)
  const [value, set_value] = useState('')
  const [error, set_error] = useState(null)
  if (!open) {
    return (
      <a
        href='#'
        className='task-properties__add'
        onClick={(event) => {
          event.preventDefault()
          set_open(true)
        }}>
        {label}
      </a>
    )
  }
  return (
    <form
      className='task-account__form'
      onSubmit={(event) => {
        event.preventDefault()
        try {
          on_add(to_pubkey(value))
          set_value('')
          set_open(false)
          set_error(null)
        } catch (err) {
          set_error(
            err.message === 'enter an npub' ? err.message : 'not a valid npub'
          )
        }
      }}>
      <p className='task-account__fine'>{help}</p>
      <input
        autoFocus
        placeholder='npub1…'
        value={value}
        onChange={(event) => set_value(event.target.value)}
      />
      <div className='task-detail__buttons'>
        <Button variant='outlined' type='submit' disabled={!value.trim()}>
          Add
        </Button>
        <Button variant='outlined' onClick={() => set_open(false)}>
          Cancel
        </Button>
      </div>
      {error && <div className='task-board__error'>{error}</div>}
    </form>
  )
}

AddRelation.propTypes = {
  label: PropTypes.string.isRequired,
  help: PropTypes.string.isRequired,
  on_add: PropTypes.func.isRequired
}

// The facts a key states about itself on the board, one module each.
export default function KeyProperties({ pubkey }) {
  const dispatch = useDispatch()
  const state = useSelector(get_task_board_state)
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    PUBLISH_KEY
  ])
  if (!state) return null

  const relations = state.key_relations[pubkey] || {}
  const edit = ({ role, other, remove = false }) =>
    dispatch(
      task_board_actions.publish({
        key: PUBLISH_KEY,
        build: (board) =>
          edit_key_relation({
            board,
            previous: state.key_properties[pubkey],
            role,
            pubkey: other,
            remove
          })
      })
    )

  // Keys that state a relation to you that you have not stated back.
  const incoming = []
  for (const [other, roles] of Object.entries(state.key_relations)) {
    for (const [role, list] of Object.entries(roles)) {
      if (list.some((r) => r.pubkey === pubkey && !r.confirmed)) {
        incoming.push({ other, role: KEY_RELATION_COUNTERPARTS[role] })
      }
    }
  }

  return (
    <section className='task-section task-properties'>
      <h3 className='task-section__title'>Properties</h3>
      {incoming.map(({ other, role }) => (
        <div key={`${other}:${role}`} className='task-properties__request'>
          <span>
            <PubkeyName pubkey={other} /> says{' '}
            {role === 'delegates_to' ? 'it acts for you' : 'you act for it'}.
          </span>
          <Button
            variant='outlined'
            size='small'
            disabled={publishing?.pending}
            onClick={() => edit({ role, other })}>
            Confirm
          </Button>
        </div>
      ))}
      <dl className='task-detail__properties task-properties__list'>
        {RELATION_PROPERTIES.map((property) => {
          const list = relations[property.role] || []
          return (
            <div key={property.role} className='task-detail__property'>
              <dt>{property.label}</dt>
              <dd>
                {list.length === 0 && (
                  <div className='task-muted'>{property.empty}</div>
                )}
                {list.map((relation) => (
                  <div key={relation.pubkey} className='task-properties__item'>
                    <PubkeyName pubkey={relation.pubkey} />
                    {!relation.confirmed && (
                      <span className='task-muted'>waiting for them</span>
                    )}
                    <a
                      href='#'
                      className='task-properties__remove'
                      onClick={(event) => {
                        event.preventDefault()
                        edit({
                          role: property.role,
                          other: relation.pubkey,
                          remove: true
                        })
                      }}>
                      remove
                    </a>
                  </div>
                ))}
                <AddRelation
                  label={property.add_label}
                  help={property.help}
                  on_add={(other) => edit({ role: property.role, other })}
                />
              </dd>
            </div>
          )
        })}
      </dl>
      {publishing?.error && (
        <div className='task-board__error'>{publishing.error}</div>
      )}
    </section>
  )
}

KeyProperties.propTypes = {
  pubkey: PropTypes.string.isRequired
}
