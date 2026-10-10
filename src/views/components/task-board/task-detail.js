import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
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
import {
  nostr_identity_actions,
  get_nostr_identity
} from '@core/nostr-identity'
import IdentityControl from './identity-control'
import { use_task_board_links } from './task-board-links'
import PubkeyName from './pubkey-name'
import Age from './age'
import { TaskTitle, TaskText } from './task-text'
import { COLUMN_TITLES, STATUS_TITLES, format_date } from './format'

const STATUSES = ['open', 'resolved', 'closed', 'draft']

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

function Field({ label, value, options, on_change }) {
  return (
    <label className='task-detail__field'>
      <span>{label}</span>
      <select value={value || ''} onChange={(e) => on_change(e.target.value)}>
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

Field.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.array,
  on_change: PropTypes.func
}

// Every change here signs a permanent event, so edits are staged and go out
// together on Save rather than on each dropdown change.
function ManageTask({ task, is_steward, publish, pending }) {
  const current = {
    status: task.status,
    priority: task.priority || '',
    state: task.state || ''
  }
  const [draft, set_draft] = useState(current)
  const changed = Object.keys(current).filter(
    (key) => draft[key] !== current[key]
  )
  const set = (key) => (value) => set_draft({ ...draft, [key]: value })

  const builds = {
    status: (b) =>
      build_task_status({ board: b, issue: task, status: draft.status }),
    priority: () =>
      build_task_label({
        issue: task,
        namespace: TASK_PRIORITY_NAMESPACE,
        value: draft.priority
      }),
    state: () =>
      build_task_label({
        issue: task,
        namespace: TASK_STATE_NAMESPACE,
        value: draft.state
      })
  }
  // One at a time: each publish renews the actor's claim, and concurrent
  // renewals would race each other.
  const save = (keys = changed) => {
    if (!keys.length) return
    const [key, ...rest] = keys
    publish(key, builds[key], () => save(rest))
  }

  return (
    <section className='task-section task-detail__manage'>
      <h3 className='task-section__title'>Manage</h3>
      <div className='task-detail__fields'>
        <Field
          label='Status'
          value={draft.status}
          options={STATUSES}
          on_change={set('status')}
        />
        {is_steward && (
          <>
            <Field
              label='Priority'
              value={draft.priority}
              options={TASK_PRIORITIES}
              on_change={set('priority')}
            />
            <Field
              label='State'
              value={draft.state}
              options={TASK_STATES}
              on_change={set('state')}
            />
          </>
        )}
      </div>
      {changed.length > 0 && (
        <div className='task-detail__save'>
          <span>
            Saving publishes {changed.join(', ')} for everyone. It cannot be
            taken back, only changed again.
          </span>
          <Button variant='outlined' disabled={pending} onClick={() => save()}>
            Save
          </Button>
          <Button
            variant='outlined'
            disabled={pending}
            onClick={() => set_draft(current)}>
            Cancel
          </Button>
        </div>
      )}
    </section>
  )
}

ManageTask.propTypes = {
  task: PropTypes.object.isRequired,
  is_steward: PropTypes.bool,
  publish: PropTypes.func.isRequired,
  pending: PropTypes.bool
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
  const [commenting, set_commenting] = useState(false)

  const top_bar = (
    <div className='task-detail__top'>
      <Link to={board_path()}>← Community Tasks</Link>
      <IdentityControl />
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
  const stage = stage_of(task)
  const join = () => {
    dispatch(nostr_identity_actions.set_panel('join'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          <span className='task-stage' data-stage={stage.key}>
            {stage.title}
          </span>
        </Property>
        {task.priority && (
          <Property label='Priority'>
            <span className='task-priority' data-priority={task.priority}>
              {task.priority}
            </span>
          </Property>
        )}
        {task.state && task.state !== 'actionable' && (
          <Property label='State'>
            <span className='task-state'>{task.state}</span>
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
                <PubkeyName pubkey={claim.pubkey} />
              </span>
            ))
          )}
        </Property>
        <Property label='Filed'>
          <PubkeyName pubkey={task.pubkey} /> <Age at={task.created_at} />
        </Property>
        {task.supersedes_issue_id && (
          <Property label='Replaces'>
            <Link to={task_path(task.supersedes_issue_id)}>
              earlier version
            </Link>
          </Property>
        )}
      </dl>

      {task.is_hidden && (
        <div className='task-board__notice'>
          Not on the board yet. A steward shows tasks from new people once they
          vouch for them.
          {is_steward && !author_trusted && (
            <Button
              variant='outlined'
              disabled={publishing('vouch')?.pending}
              onClick={() =>
                publish('vouch', () =>
                  build_triage_set({
                    pubkeys: [...new Set([...own_triage_set, task.pubkey])]
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

      {(is_steward || is_author) && (
        <ManageTask
          key={`${task.status}:${task.priority}:${task.state}`}
          task={task}
          is_steward={is_steward}
          publish={publish}
          pending={any_pending}
        />
      )}

      {errors.map((error) => (
        <div key={error} className='task-board__error'>
          {error}
        </div>
      ))}

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
              <PubkeyName pubkey={event.pubkey} /> <Age at={event.created_at} />
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
              publish('comment', () =>
                build_task_comment({ issue: task, content })
              )
              set_comment('')
              set_commenting(false)
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
                Comment
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
          <Button variant='outlined' onClick={join}>
            Join in to comment or work on this
          </Button>
        )}
      </section>
    </div>
  )
}

TaskDetail.propTypes = {
  issue_id: PropTypes.string.isRequired
}
