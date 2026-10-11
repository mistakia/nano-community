import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import { useDispatch, useSelector } from 'react-redux'

import {
  build_task_status,
  build_task_label,
  build_task_claim,
  build_task_comment,
  edit_vouch_set,
  TASK_PRIORITY_NAMESPACE,
  TASK_STATE_NAMESPACE,
  TASK_PRIORITIES,
  TASK_STATES
} from '#common/task-board/index.mjs'
import {
  task_board_actions,
  get_task_board,
  get_task_board_state,
  get_task_comments
} from '@core/task-board'
import { get_nostr_identity } from '@core/nostr-identity'
import IdentityLink, { use_go_to_account } from './identity-link'
import { use_task_board_links } from './task-board-links'
import PubkeyName from './pubkey-name'
import Age from './age'
import InlineSelect from './inline-select'
import TaskPledges from './task-pledges'
import { TaskTitle, TaskText } from './task-text'
import { COLUMN_TITLES, STATUS_TITLES, format_date } from './format'

const STATUSES = ['open', 'resolved', 'closed', 'draft']

const as_options = (values, titles = {}) =>
  values.map((value) => ({ value, label: titles[value] || value }))

const PUBLISH_KEYS = [
  'status',
  'priority',
  'state',
  'claim',
  'comment',
  'vouch'
]

// An open task's place on the board says more than "open"; any other status
// is the whole story.
const stage_of = (task) =>
  task.status === 'open'
    ? { key: task.column, title: COLUMN_TITLES[task.column] }
    : { key: task.status, title: STATUS_TITLES[task.status] }

function Property({ label, children }) {
  return (
    <div className='task-detail__property'>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

Property.propTypes = { label: PropTypes.string, children: PropTypes.node }

export default function TaskDetail({ issue_id }) {
  const dispatch = useDispatch()
  const { Link, board_path, task_path, account_path } = use_task_board_links()
  const board = useSelector(get_task_board)
  const state = useSelector(get_task_board_state)
  const identity = useSelector(get_nostr_identity)
  const comments = useSelector((s) => get_task_comments(s, issue_id))
  const pubkey = identity.get('pubkey')
  const [comment, set_comment] = useState('')
  const go_to_account = use_go_to_account()
  const [staged, set_staged] = useState({})
  const [commenting, set_commenting] = useState(false)

  const top_bar = (
    <div className='task-detail__top'>
      <Link to={board_path()}>← Community Tasks</Link>
      <IdentityLink />
    </div>
  )

  const task = state?.tasks[issue_id]
  if (!task) {
    return (
      <div className='task-detail'>
        {top_bar}
        <p>
          {board.get('is_loaded')
            ? 'This task is not on this board, or no relay holds it.'
            : 'Loading from relays…'}
        </p>
      </div>
    )
  }

  const is_steward = Boolean(pubkey) && state.stewards.includes(pubkey)
  const is_voucher = is_steward || state.trust[pubkey]?.step === 1
  const is_author = Boolean(pubkey) && pubkey === task.pubkey
  const is_claimant = Boolean(pubkey) && task.active_claimants.includes(pubkey)
  const publishing = (key) => board.getIn(['publishing', `${key}:${issue_id}`])
  const publish = (key, build, on_published) =>
    dispatch(
      task_board_actions.publish({
        key: `${key}:${issue_id}`,
        build,
        issue_id,
        on_published
      })
    )
  const errors = PUBLISH_KEYS.map((key) => publishing(key)?.error).filter(
    Boolean
  )
  // Any action renews the claimant's claim, so a claim change waits for it.
  const any_pending = PUBLISH_KEYS.some((key) => publishing(key)?.pending)

  const author_trusted =
    state.stewards.includes(task.pubkey) || state.trusted.includes(task.pubkey)
  const active_claims = task.claims.filter((claim) => claim.is_active)
  const current = {
    status: task.status,
    priority: task.priority || '',
    state: task.state || 'actionable'
  }
  const value_of = (key) => staged[key] ?? current[key]
  const changed = Object.keys(staged).filter(
    (key) => staged[key] !== current[key]
  )
  const stage = stage_of({ ...task, status: value_of('status') })
  const can_edit_status = is_steward || is_author
  const stage_options = as_options(STATUSES, STATUS_TITLES)
  const stage_key = (key) => (value) => set_staged({ ...staged, [key]: value })

  // Each edit signs a permanent event, so edits are staged in place and go
  // out together on Save, one at a time: each publish renews the actor's
  // claim, and concurrent renewals would race.
  const builds = {
    status: (b) =>
      build_task_status({ board: b, issue: task, status: staged.status }),
    priority: () =>
      build_task_label({
        issue: task,
        namespace: TASK_PRIORITY_NAMESPACE,
        value: staged.priority
      }),
    state: () =>
      build_task_label({
        issue: task,
        namespace: TASK_STATE_NAMESPACE,
        value: staged.state
      })
  }
  const save = (keys = changed) => {
    if (!keys.length) return set_staged({})
    const [key, ...rest] = keys
    publish(key, builds[key], () => save(rest))
  }

  return (
    <div className='task-detail'>
      {top_bar}
      <div className='task-detail__type'>Task</div>
      <h1 className='task-detail__subject'>
        <TaskTitle subject={task.subject} />
      </h1>

      <dl className='task-detail__properties'>
        <Property label='Stage'>
          <InlineSelect
            label='Stage'
            value={value_of('status')}
            options={stage_options}
            on_select={stage_key('status')}
            editable={can_edit_status}
            staged={changed.includes('status')}>
            <span className='task-stage' data-stage={stage.key}>
              {stage.title}
            </span>
          </InlineSelect>
        </Property>
        {(task.priority || is_steward) && (
          <Property label='Priority'>
            <InlineSelect
              label='Priority'
              value={value_of('priority')}
              options={as_options(TASK_PRIORITIES)}
              on_select={stage_key('priority')}
              editable={is_steward}
              staged={changed.includes('priority')}>
              {value_of('priority') ? (
                <span
                  className='task-priority'
                  data-priority={value_of('priority')}>
                  {value_of('priority')}
                </span>
              ) : (
                <span className='task-muted'>none</span>
              )}
            </InlineSelect>
          </Property>
        )}
        {(value_of('state') !== 'actionable' || is_steward) && (
          <Property label='State'>
            <InlineSelect
              label='State'
              value={value_of('state')}
              options={as_options(TASK_STATES)}
              on_select={stage_key('state')}
              editable={is_steward}
              staged={changed.includes('state')}>
              <span className='task-state'>{value_of('state')}</span>
            </InlineSelect>
          </Property>
        )}
        <Property label='Working on it'>
          {active_claims.length === 0 ? (
            <span className='task-muted'>Nobody yet</span>
          ) : (
            active_claims.map((claim, index) => (
              <span
                key={claim.pubkey}
                title={`Since ${format_date(claim.created_at)}${claim.expiration ? `, lapses ${format_date(claim.expiration)} unless renewed` : ''}`}>
                {index > 0 && ', '}
                <PubkeyName pubkey={claim.pubkey} mark_untrusted />
              </span>
            ))
          )}
        </Property>
        <Property label='Filed'>
          <PubkeyName pubkey={task.pubkey} mark_untrusted />{' '}
          <Age at={task.created_at} />
        </Property>
        {task.supersedes_issue_id && (
          <Property label='Replaces'>
            <Link to={task_path(task.supersedes_issue_id)}>
              earlier version
            </Link>
          </Property>
        )}
      </dl>

      {changed.length > 0 && (
        <div className='task-detail__save'>
          <span>
            Saving publishes {changed.join(', ')} for everyone. It cannot be
            taken back, only changed again.
          </span>
          <Button
            variant='outlined'
            disabled={any_pending}
            onClick={() => save()}>
            Save
          </Button>
          <Button
            variant='outlined'
            disabled={any_pending}
            onClick={() => set_staged({})}>
            Cancel
          </Button>
        </div>
      )}

      {task.is_hidden && (
        <div className='task-board__notice'>
          Not on the board yet. It shows once a steward vouches for its author,
          or two people a steward vouches for do.
          {is_voucher && !author_trusted && (
            <Button
              variant='outlined'
              disabled={publishing('vouch')?.pending}
              onClick={() =>
                publish('vouch', () =>
                  edit_vouch_set({
                    previous: state.vouch_sets[pubkey],
                    pubkey: task.pubkey
                  })
                )
              }>
              Vouch for <PubkeyName pubkey={task.pubkey} />
            </Button>
          )}
        </div>
      )}

      <TaskText content={task.content} hide_board_line />

      {pubkey && task.status === 'open' && (
        <div className='task-detail__actions'>
          <Button
            variant='outlined'
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
            {is_claimant
              ? 'Stop working on this'
              : active_claims.length > 0
                ? 'Also work on this'
                : 'Work on this'}
          </Button>
        </div>
      )}

      {errors.map((error) => (
        <div key={error} className='task-board__error'>
          {error}
        </div>
      ))}

      <TaskPledges task={task} pubkey={pubkey} />

      <section className='task-section task-detail__comments'>
        <h3 className='task-section__title'>
          Discussion
          {comments.length > 0 && (
            <span className='task-section__count'>{comments.length}</span>
          )}
        </h3>
        {comments.map((event) => (
          <div key={event.id} className='task-detail__comment'>
            <div className='task-detail__comment-meta'>
              <PubkeyName pubkey={event.pubkey} mark_untrusted />{' '}
              <Age at={event.created_at} />
            </div>
            <TaskText content={event.content} />
          </div>
        ))}
        {pubkey && commenting && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!comment.trim()) return
              const content = comment.trim()
              // The form stays open, showing Preparing while it mines,
              // and keeps the text if publishing fails.
              publish(
                'comment',
                () => build_task_comment({ issue: task, content }),
                () => {
                  set_comment('')
                  set_commenting(false)
                }
              )
            }}>
            <textarea
              rows={4}
              autoFocus
              placeholder='Add a comment'
              value={comment}
              onChange={(event) => set_comment(event.target.value)}
            />
            <div className='task-detail__buttons'>
              <Button
                variant='outlined'
                type='submit'
                disabled={publishing('comment')?.pending || !comment.trim()}>
                {publishing('comment')?.preparing ? 'Preparing…' : 'Comment'}
              </Button>
              <Button
                variant='outlined'
                onClick={() => {
                  set_comment('')
                  set_commenting(false)
                }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {pubkey && !commenting && (
          <Button variant='outlined' onClick={() => set_commenting(true)}>
            Add a comment
          </Button>
        )}
        {!pubkey && (
          <p className='task-muted'>
            <Link to={account_path()} onClick={go_to_account}>
              Join in
            </Link>{' '}
            to comment or work on this.
          </p>
        )}
      </section>
    </div>
  )
}

TaskDetail.propTypes = {
  issue_id: PropTypes.string.isRequired
}
