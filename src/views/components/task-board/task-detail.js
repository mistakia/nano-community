import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'

import {
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  build_triage_set,
  TASK_PRIORITY_NAMESPACE,
  TASK_STATE_NAMESPACE,
  TASK_PRIORITIES,
  TASK_STATES
} from '#common/task-board/index.mjs'
import {
  task_board_actions,
  get_task_board,
  get_task_board_state,
  get_task_comments,
  get_own_triage_set
} from '@core/task-board'
import { get_nostr_identity } from '@core/nostr-identity'
import IdentityBar from './identity-bar'
import { use_task_board_links } from './task-board-links'
import PubkeyName from './pubkey-name'
import { COLUMN_TITLES, format_age } from './format'

const STATUSES = ['open', 'resolved', 'closed', 'draft']

function Select({ label, value, options, on_change, disabled }) {
  return (
    <label className='task-detail__select'>
      {label}
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(event) => on_change(event.target.value)}>
        {!value && <option value=''>none</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

Select.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.array,
  on_change: PropTypes.func,
  disabled: PropTypes.bool
}

export default function TaskDetail({ issue_id }) {
  const dispatch = useDispatch()
  const { Link, board_path, task_path } = use_task_board_links()
  const board = useSelector(get_task_board)
  const state = useSelector(get_task_board_state)
  const identity = useSelector(get_nostr_identity)
  const comments = useSelector((s) => get_task_comments(s, issue_id))
  const pubkey = identity.get('pubkey')
  const own_triage_set = useSelector((s) => get_own_triage_set(s, pubkey))
  const [comment, set_comment] = useState('')

  const task = state?.tasks[issue_id]
  if (!task) {
    return (
      <div className='task-detail'>
        <Link to={board_path()}>Back to the board</Link>
        <p>
          {board.get('is_loaded')
            ? 'This task is not on this board, or no relay holds it.'
            : 'Loading from relays…'}
        </p>
      </div>
    )
  }

  const is_steward = Boolean(pubkey) && state.stewards.includes(pubkey)
  const is_author = pubkey === task.pubkey
  const is_claimant = Boolean(pubkey) && task.active_claimants.includes(pubkey)
  const publishing = (key) => board.getIn(['publishing', `${key}:${issue_id}`])
  const publish = (key, build) =>
    dispatch(
      task_board_actions.publish({ key: `${key}:${issue_id}`, build, issue_id })
    )

  const publish_keys = [
    'status',
    'priority',
    'state',
    'claim',
    'comment',
    'vouch'
  ]
  const errors = publish_keys
    .map((key) => publishing(key)?.error)
    .filter(Boolean)
  // Any action renews the claimant's claim, so a claim change waits for it.
  const any_pending = publish_keys.some((key) => publishing(key)?.pending)

  const author_trusted =
    state.stewards.includes(task.pubkey) || state.trusted.includes(task.pubkey)

  return (
    <div className='task-detail'>
      <IdentityBar />
      <Link to={board_path()}>Back to the board</Link>
      <h1 className='task-detail__subject'>{task.subject}</h1>
      <div className='task-detail__meta'>
        <span className='task-board__chip'>{task.status}</span>
        <span className='task-board__chip'>{COLUMN_TITLES[task.column]}</span>
        {task.priority && (
          <span
            className={`task-board__priority task-board__priority--${task.priority}`}>
            {task.priority}
          </span>
        )}
        {task.state && <span className='task-board__chip'>{task.state}</span>}
        <span>
          filed by <PubkeyName pubkey={task.pubkey} />{' '}
          {format_age(task.created_at)}
        </span>
      </div>
      {task.is_hidden && (
        <div className='task-board__notice'>
          No steward has vouched for this author yet, so this task is not shown
          on the board.
        </div>
      )}
      {task.supersedes_issue_id && (
        <div className='task-board__hint'>
          Replaces an earlier version:{' '}
          <Link to={task_path(task.supersedes_issue_id)}>previous issue</Link>
        </div>
      )}
      <div className='task-detail__content'>{task.content}</div>

      <div className='task-detail__claims'>
        <h3>Working on this</h3>
        {task.active_claimants.length === 0 && <div>Nobody yet.</div>}
        {task.claims
          .filter((claim) => claim.is_active)
          .map((claim) => (
            <div key={claim.pubkey}>
              <PubkeyName pubkey={claim.pubkey} /> claimed{' '}
              {format_age(claim.created_at)}
              {claim.expiration &&
                `, lapses in ${Math.ceil((claim.expiration - Date.now() / 1000) / 86400)}d unless renewed`}
            </div>
          ))}
        {task.status === 'open' && (
          <button
            disabled={any_pending}
            onClick={() =>
              publish('claim', (b) =>
                build_task_claim({
                  board: b,
                  issue: task,
                  status: is_claimant ? 'released' : 'active'
                })
              )
            }>
            {is_claimant ? 'Release my claim' : 'Claim this task'}
          </button>
        )}
      </div>

      {(is_steward || is_author) && (
        <div className='task-detail__controls'>
          <Select
            label='Status'
            value={task.status}
            options={STATUSES}
            disabled={publishing('status')?.pending}
            on_change={(status) =>
              publish('status', (b) =>
                build_task_status({ board: b, issue: task, status })
              )
            }
          />
          {is_steward && (
            <>
              <Select
                label='Priority'
                value={task.priority}
                options={TASK_PRIORITIES}
                disabled={publishing('priority')?.pending}
                on_change={(value) =>
                  publish('priority', () =>
                    build_task_label({
                      issue: task,
                      namespace: TASK_PRIORITY_NAMESPACE,
                      value
                    })
                  )
                }
              />
              <Select
                label='State'
                value={task.state}
                options={TASK_STATES}
                disabled={publishing('state')?.pending}
                on_change={(value) =>
                  publish('state', () =>
                    build_task_label({
                      issue: task,
                      namespace: TASK_STATE_NAMESPACE,
                      value
                    })
                  )
                }
              />
              {!author_trusted && (
                <button
                  disabled={publishing('vouch')?.pending}
                  onClick={() =>
                    publish('vouch', () =>
                      build_triage_set({
                        pubkeys: [...new Set([...own_triage_set, task.pubkey])]
                      })
                    )
                  }>
                  Vouch for this author
                </button>
              )}
            </>
          )}
        </div>
      )}

      {errors.map((error) => (
        <div key={error} className='task-board__error'>
          {error}
        </div>
      ))}

      <div className='task-detail__comments'>
        <h3>Discussion</h3>
        {comments.map((event) => (
          <div key={event.id} className='task-detail__comment'>
            <div className='task-detail__comment-meta'>
              <PubkeyName pubkey={event.pubkey} />{' '}
              {format_age(event.created_at)}
            </div>
            <div className='task-detail__comment-content'>{event.content}</div>
          </div>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!comment.trim()) return
            const content = comment.trim()
            publish('comment', () =>
              build_task_comment({ issue: task, content })
            )
            set_comment('')
          }}>
          <textarea
            rows={3}
            placeholder='Add a comment'
            value={comment}
            onChange={(event) => set_comment(event.target.value)}
          />
          <button
            type='submit'
            disabled={publishing('comment')?.pending || !comment.trim()}>
            Comment
          </button>
        </form>
      </div>
    </div>
  )
}

TaskDetail.propTypes = {
  issue_id: PropTypes.string.isRequired
}
