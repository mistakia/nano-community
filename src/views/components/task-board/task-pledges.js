import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import { useDispatch, useSelector } from 'react-redux'
import { nip19 } from 'nostr-tools'

import {
  encode_signed_message,
  verify_signed_message
} from 'nano-signed-message'

import {
  build_pledge_payload,
  build_task_pledge,
  parse_task_pledge
} from '#common/task-board/index.mjs'
import {
  task_board_actions,
  get_task_board,
  get_own_pledge_event
} from '@core/task-board'
import PubkeyName from './pubkey-name'
import CopyValue from './copy-value'
import { format_xno, parse_xno } from './format'

const CLI = 'npx nano-community-cli@0.3.0'
const BLOCK_HASH_RE = /^[0-9A-Fa-f]{64}$/

const VERDICT_TITLES = {
  pending: 'awaiting a steward check',
  backed: 'backed',
  unbacked: 'not backed',
  paid: 'paid'
}

// The proof pasted from the CLI: its JSON output, or any text holding a
// nano_ account and an <issued_at>:<signature> proof.
const read_pasted_proof = (text) => {
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{')))
    if (parsed.account && parsed.proof) return parsed
  } catch {}
  const account = /\bnano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}\b/.exec(
    text
  )
  const proof = /\b(\d+):([0-9a-fA-F]{128})\b/.exec(text)
  return account && proof ? { account: account[0], proof: proof[0] } : null
}

// Pledges on a task: who promised how much, each steward verdict, and a form
// to pledge, change a pledge or record its payout.
export default function TaskPledges({ task, pubkey }) {
  const dispatch = useDispatch()
  const publish_key = `pledge:${task.id}`
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    publish_key
  ])
  const own_event = useSelector((s) =>
    pubkey ? get_own_pledge_event(s, pubkey, task.id) : null
  )
  const own = own_event && parse_task_pledge(own_event)
  const [mode, set_mode] = useState(null) // 'pledge' | 'payout' | null
  const is_open = task.status === 'open'
  const [amount, set_amount] = useState('')
  const [pasted, set_pasted] = useState('')
  const [payout, set_payout] = useState('')
  const [error, set_error] = useState(null)

  const close = () => {
    set_mode(null)
    set_pasted('')
    set_payout('')
    set_error(null)
  }
  const publish = (build) =>
    dispatch(
      task_board_actions.publish({
        key: publish_key,
        build,
        on_published: close
      })
    )

  const amount_raw = parse_xno(amount)
  const npub = pubkey && nip19.npubEncode(pubkey)

  const pledge = () => {
    if (!amount_raw) return set_error('Enter a positive XNO amount.')
    const proof = read_pasted_proof(pasted.trim())
    if (!proof) {
      return set_error(
        'Paste the output of the command, or an account and proof.'
      )
    }
    const [issued_at, signature] = proof.proof.split(':')
    try {
      verify_signed_message({
        message: encode_signed_message(
          build_pledge_payload({
            account: proof.account,
            issue_event_id: task.id,
            amount_raw,
            nostr_public_key: pubkey,
            issued_at: Number(issued_at)
          })
        ),
        signature,
        domain: 'nostr',
        actions: ['pledge']
      })
    } catch {
      return set_error(
        `That proof does not verify for ${format_xno(amount_raw)} on this task from this key.`
      )
    }
    set_error(null)
    publish((board) =>
      build_task_pledge({
        board,
        issue_id: task.id,
        account: proof.account,
        amount_raw,
        issued_at: Number(issued_at),
        signature
      })
    )
  }

  // The payout rides on the same proof; only the block hash is new.
  const record_payout = () => {
    if (!BLOCK_HASH_RE.test(payout.trim())) {
      return set_error('Enter the 64-character hash of the payment block.')
    }
    set_error(null)
    publish((board) =>
      build_task_pledge({
        board,
        issue_id: task.id,
        account: own.account,
        amount_raw: own.amount_raw,
        issued_at: own.issued_at,
        signature: own.signature,
        payout: payout.trim()
      })
    )
  }

  const has_pledges = task.pledges.length > 0
  if (!has_pledges && !pubkey) return null

  return (
    <section className='task-section task-pledges'>
      <h3 className='task-section__title'>
        Pledges
        {BigInt(task.pledged_raw) > 0n && (
          <span className='task-section__count'>
            {format_xno(task.pledged_raw)} backed
          </span>
        )}
        {BigInt(task.paid_raw) > 0n && (
          <span className='task-section__count'>
            {format_xno(task.paid_raw)} paid
          </span>
        )}
      </h3>
      {has_pledges ? (
        task.pledges.map((item) => (
          <div key={item.pubkey} className='task-pledges__row'>
            <PubkeyName pubkey={item.pubkey} />
            <span>{format_xno(item.amount_raw)}</span>
            <span className='task-muted'>{VERDICT_TITLES[item.verdict]}</span>
          </div>
        ))
      ) : (
        <p className='task-muted task-pledges__empty'>
          No pledges yet. A pledge is a public promise, from a Nano account, to
          pay whoever completes this task. Funds stay in your account.
        </p>
      )}

      {/* New pledges only on open tasks; a payment can be recorded after. */}
      {pubkey && !mode && (is_open || (own && !own.payout)) && (
        <div className='task-pledges__links'>
          {is_open && (
            <a
              href='#'
              className='task-properties__add'
              onClick={(event) => {
                event.preventDefault()
                set_mode('pledge')
              }}>
              {own ? 'Change your pledge' : 'Pledge XNO'}
            </a>
          )}
          {own && !own.payout && (
            <a
              href='#'
              className='task-properties__add'
              onClick={(event) => {
                event.preventDefault()
                set_mode('payout')
              }}>
              Record your payment
            </a>
          )}
        </div>
      )}

      {mode === 'pledge' && (
        <form
          className='task-account__form'
          onSubmit={(event) => {
            event.preventDefault()
            pledge()
          }}>
          <label htmlFor='pledge-amount'>Amount in XNO</label>
          <input
            id='pledge-amount'
            inputMode='decimal'
            value={amount}
            onChange={(event) => set_amount(event.target.value)}
          />
          {amount_raw && (
            <>
              <p className='task-account__fine'>
                Sign with your Nano account, then paste the result here. Your
                Nano key never leaves your machine.
              </p>
              <CopyValue
                value={`${CLI} pledge ${task.id} ${amount.trim()} ${npub}`}
              />
              <textarea
                aria-label='Signed pledge'
                rows={4}
                value={pasted}
                onChange={(event) => set_pasted(event.target.value)}
              />
            </>
          )}
          <p className='task-account__fine'>
            A steward checks within the hour that the account holds what it
            pledged. Pledging again replaces your pledge.
          </p>
          <div className='task-detail__buttons'>
            <Button
              variant='outlined'
              type='submit'
              disabled={!amount_raw || !pasted.trim() || publishing?.pending}>
              Pledge
            </Button>
            <Button variant='outlined' onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {mode === 'payout' && own && (
        <form
          className='task-account__form'
          onSubmit={(event) => {
            event.preventDefault()
            record_payout()
          }}>
          <label htmlFor='pledge-payout'>Payment block hash</label>
          <input
            id='pledge-payout'
            value={payout}
            onChange={(event) => set_payout(event.target.value)}
          />
          <p className='task-account__fine'>
            The send of at least {format_xno(own.amount_raw)} from your account
            to the Nano account linked to someone who worked on this task. A
            steward confirms it on chain.
          </p>
          <div className='task-detail__buttons'>
            <Button
              variant='outlined'
              type='submit'
              disabled={!payout.trim() || publishing?.pending}>
              Record
            </Button>
            <Button variant='outlined' onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {(error || publishing?.error) && (
        <div className='task-board__error'>{error || publishing.error}</div>
      )}
    </section>
  )
}

TaskPledges.propTypes = {
  task: PropTypes.object.isRequired,
  pubkey: PropTypes.string
}
