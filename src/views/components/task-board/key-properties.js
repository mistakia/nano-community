import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import Button from '@mui/material/Button'
import { nip19 } from 'nostr-tools'

import {
  encode_signed_message,
  verify_signed_message
} from 'nano-signed-message'

import {
  KEY_RELATION_COUNTERPARTS,
  edit_key_relation,
  edit_vouch_set,
  build_profile_name,
  build_bind_nostr_key_payload,
  build_nano_account_binding,
  BIND_NOSTR_KEY_STATEMENT_PREFIX,
  build_deletion_request
} from '#common/task-board/index.mjs'
import {
  task_board_actions,
  get_task_board,
  get_task_board_state,
  get_profile_name,
  get_profile_content,
  has_board_activity,
  get_nano_binding
} from '@core/task-board'
import PubkeyName from './pubkey-name'
import CopyValue from './copy-value'

const PUBLISH_KEY = 'key-properties'
const NAME_PUBLISH_KEY = 'profile-name'
const VOUCH_PUBLISH_KEY = 'vouch-set'
const NANO_PUBLISH_KEY = 'nano-binding'
const NANO_ACCOUNT_BAR =
  'opened at least 30 days ago and holding at least 1 XNO'
const MAX_NAME_LENGTH = 40

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

// The key's kind 0 name. The community relay takes one only from a key that
// has already posted on the board, so a new key is told to post first.
function NameProperty({ pubkey }) {
  const dispatch = useDispatch()
  const name = useSelector((state) => get_profile_name(state, pubkey))
  const content = useSelector((state) => get_profile_content(state, pubkey))
  const active = useSelector((state) => has_board_activity(state, pubkey))
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    NAME_PUBLISH_KEY
  ])
  const [editing, set_editing] = useState(false)
  const [value, set_value] = useState('')

  const error =
    publishing?.error && publishing.error.includes('no board activity')
      ? 'The relay takes a name once this key has posted on the board.'
      : publishing?.error

  return (
    <div className='task-detail__property'>
      <dt>Name</dt>
      <dd>
        {name ? (
          <div>{name}</div>
        ) : (
          <div className='task-muted'>None yet. Others see your npub.</div>
        )}
        {!active && (
          <div className='task-muted'>
            You can set a name once you have filed, taken or commented on a
            task.
          </div>
        )}
        {active && !editing && (
          <a
            href='#'
            className='task-properties__add'
            onClick={(event) => {
              event.preventDefault()
              set_value(name || '')
              set_editing(true)
            }}>
            {name ? 'Change your name' : 'Set a name'}
          </a>
        )}
        {active && editing && (
          <form
            className='task-account__form'
            onSubmit={(event) => {
              event.preventDefault()
              dispatch(
                task_board_actions.publish({
                  key: NAME_PUBLISH_KEY,
                  build: () =>
                    build_profile_name({
                      previous_content: content,
                      name: value
                    }),
                  on_published: () => set_editing(false)
                })
              )
            }}>
            <p className='task-account__fine'>
              Your nostr profile name, shown wherever this key is used.
            </p>
            <input
              autoFocus
              aria-label='Name'
              maxLength={MAX_NAME_LENGTH}
              value={value}
              onChange={(event) => set_value(event.target.value)}
            />
            <div className='task-detail__buttons'>
              <Button
                variant='outlined'
                type='submit'
                disabled={!value.trim() || publishing?.pending}>
                Save
              </Button>
              <Button variant='outlined' onClick={() => set_editing(false)}>
                Cancel
              </Button>
            </div>
            {error && <div className='task-board__error'>{error}</div>}
          </form>
        )}
      </dd>
    </div>
  )
}

NameProperty.propTypes = {
  pubkey: PropTypes.string.isRequired
}

const short_account = (account) =>
  `${account.slice(0, 10)}…${account.slice(-4)}`

const list_names = (pubkeys) =>
  pubkeys.map((pubkey, index) => (
    <React.Fragment key={pubkey}>
      {index > 0 && ', '}
      <PubkeyName pubkey={pubkey} />
    </React.Fragment>
  ))

// Where the key stands in the board's web of trust.
function TrustProperty({ pubkey, state }) {
  const entry = state.trust[pubkey]
  let text
  if (state.stewards.includes(pubkey)) {
    text = <div>Steward</div>
  } else if (state.blocked.includes(pubkey)) {
    text = <div>Blocked by a steward. Your tasks stay off the board.</div>
  } else if (entry) {
    text = (
      <div>
        Trusted, vouched for by {list_names(entry.vouchers)}
        {entry.step === 2 && entry.vouchers.length === 1 && (
          <span className='task-muted'> and your Nano account</span>
        )}
      </div>
    )
  } else {
    text = (
      <div className='task-muted'>
        Not vouched for yet. A steward can vouch for you, or two people a
        steward vouches for. With a linked Nano account, one of them is enough.
      </div>
    )
  }
  return (
    <div className='task-detail__property'>
      <dt>Trust</dt>
      <dd>{text}</dd>
    </div>
  )
}

TrustProperty.propTypes = {
  pubkey: PropTypes.string.isRequired,
  state: PropTypes.object.isRequired
}

// The keys this key vouches for. Only stewards and the keys they vouch for
// can vouch, so it shows only for them.
function VouchingProperty({ pubkey, state }) {
  const dispatch = useDispatch()
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    VOUCH_PUBLISH_KEY
  ])
  const is_voucher =
    state.stewards.includes(pubkey) || state.trust[pubkey]?.step === 1
  if (!is_voucher) return null
  const own = state.vouch_sets[pubkey]
  const vouched = own
    ? own.tags.filter((tag) => tag[0] === 'p').map((tag) => tag[1])
    : []
  const edit = ({ other, remove = false }) =>
    dispatch(
      task_board_actions.publish({
        key: VOUCH_PUBLISH_KEY,
        build: () => edit_vouch_set({ previous: own, pubkey: other, remove })
      })
    )
  return (
    <div className='task-detail__property'>
      <dt>Vouching for</dt>
      <dd>
        {vouched.length === 0 && <div className='task-muted'>Nobody yet.</div>}
        {vouched.map((other) => (
          <div key={other} className='task-properties__item'>
            <PubkeyName pubkey={other} />
            <a
              href='#'
              className='task-properties__remove'
              onClick={(event) => {
                event.preventDefault()
                edit({ other, remove: true })
              }}>
              remove
            </a>
          </div>
        ))}
        <AddRelation
          label='Vouch for a key'
          help='Their tasks and comments then count on the board. Vouch only for people you know.'
          on_add={(other) => edit({ other })}
        />
        {publishing?.error && (
          <div className='task-board__error'>{publishing.error}</div>
        )}
      </dd>
    </div>
  )
}

VouchingProperty.propTypes = {
  pubkey: PropTypes.string.isRequired,
  state: PropTypes.object.isRequired
}

// The proof pasted from a signer: the CLI's JSON output, or any text that
// holds a nano_ account and an <issued_at>:<signature> proof.
const read_pasted_proof = (text) => {
  try {
    const parsed = JSON.parse(text)
    if (parsed.account && parsed.proof) return parsed
  } catch {}
  const account = /nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}/.exec(text)
  const proof = /\b(\d+):([0-9a-fA-F]{128})\b/.exec(text)
  return account && proof ? { account: account[0], proof: proof[0] } : null
}

// The Nano account this key binds (kind 10011) and the steward verdict on it.
function NanoAccountProperty({ pubkey, state }) {
  const dispatch = useDispatch()
  const nano = useSelector((s) => get_nano_binding(s, pubkey))
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    NANO_PUBLISH_KEY
  ])
  const [linking, set_linking] = useState(false)
  const [pasted, set_pasted] = useState('')
  const [error, set_error] = useState(null)
  const npub = nip19.npubEncode(pubkey)
  const binding = nano?.binding
  const attestation = state.account_attestations[pubkey]
  const now = Math.floor(Date.now() / 1000)
  const verdict =
    attestation && attestation.expiration > now ? attestation.value : null

  const publish = (build) =>
    dispatch(
      task_board_actions.publish({
        key: NANO_PUBLISH_KEY,
        build,
        on_published: () => {
          set_linking(false)
          set_pasted('')
        }
      })
    )

  const link = () => {
    const proof = read_pasted_proof(pasted.trim())
    if (!proof) {
      set_error('Paste the output of the command, or an account and proof.')
      return
    }
    const [issued_at, signature] = proof.proof.split(':')
    try {
      verify_signed_message({
        message: encode_signed_message(
          build_bind_nostr_key_payload({
            account: proof.account,
            npub,
            issued_at: Number(issued_at)
          })
        ),
        signature,
        domain: 'nostr',
        actions: ['bind_nostr_key']
      })
    } catch {
      set_error('That proof does not verify for this key. Sign it for ' + npub)
      return
    }
    set_error(null)
    publish(() =>
      build_nano_account_binding({
        account: proof.account,
        issued_at: Number(issued_at),
        signature
      })
    )
  }

  return (
    <div className='task-detail__property'>
      <dt>Nano account</dt>
      <dd>
        {binding ? (
          <>
            <div title={binding.account}>{short_account(binding.account)}</div>
            <div className='task-muted'>
              {verdict === 'established'
                ? 'Established. It counts as one vouch.'
                : verdict === 'not_established'
                  ? `Not established. It counts once it is ${NANO_ACCOUNT_BAR}, linked to no other key.`
                  : 'A steward checks it within the hour.'}
            </div>
            <a
              href='#'
              className='task-properties__remove'
              onClick={(event) => {
                event.preventDefault()
                publish(() =>
                  build_deletion_request({
                    events: [nano.event],
                    reason: 'unlinked'
                  })
                )
              }}>
              unlink
            </a>
          </>
        ) : (
          <div className='task-muted'>
            None linked. An account {NANO_ACCOUNT_BAR} counts as one vouch.
          </div>
        )}
        {!binding && !linking && (
          <a
            href='#'
            className='task-properties__add'
            onClick={(event) => {
              event.preventDefault()
              set_linking(true)
            }}>
            Link a Nano account
          </a>
        )}
        {!binding && linking && (
          <form
            className='task-account__form'
            onSubmit={(event) => {
              event.preventDefault()
              link()
            }}>
            <p className='task-account__fine'>
              Sign with your Nano account, then paste the result here. Your Nano
              key never leaves your machine.
            </p>
            <CopyValue
              value={`npx nano-community-cli bind-nostr-key ${npub}`}
            />
            <p className='task-account__fine'>
              Any tool that implements the Nano signed-message format works:
              sign the <code>bind_nostr_key</code> statement “
              {BIND_NOSTR_KEY_STATEMENT_PREFIX}
              {npub}”.
            </p>
            <textarea
              aria-label='Signed proof'
              rows={4}
              value={pasted}
              onChange={(event) => set_pasted(event.target.value)}
            />
            <div className='task-detail__buttons'>
              <Button
                variant='outlined'
                type='submit'
                disabled={!pasted.trim() || publishing?.pending}>
                Link
              </Button>
              <Button variant='outlined' onClick={() => set_linking(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {(error || publishing?.error) && (
          <div className='task-board__error'>{error || publishing.error}</div>
        )}
      </dd>
    </div>
  )
}

NanoAccountProperty.propTypes = {
  pubkey: PropTypes.string.isRequired,
  state: PropTypes.object.isRequired
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
        <NameProperty pubkey={pubkey} />
        <TrustProperty pubkey={pubkey} state={state} />
        <NanoAccountProperty pubkey={pubkey} state={state} />
        <VouchingProperty pubkey={pubkey} state={state} />
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
