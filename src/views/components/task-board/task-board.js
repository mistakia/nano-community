import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import { useSelector } from 'react-redux'

import { get_task_board, get_task_board_state } from '@core/task-board'
import { get_nostr_identity } from '@core/nostr-identity'
import IdentityLink from './identity-link'
import PubkeyName from './pubkey-name'
import Age from './age'
import { TaskTitle } from './task-text'
import { use_task_board_links } from './task-board-links'
import { COLUMN_TITLES } from './format'

const BOARD_COLUMNS = [
  'in_progress',
  'needs_taker',
  'blocked',
  'triage',
  'draft',
  'closed'
]

// Drafts are not ready for anyone to take and closed tasks are finished, so
// both start folded away.
const COLLAPSED_BY_DEFAULT = ['draft', 'closed']

// The closed column only grows, so it shows the most recent until asked.
const CLOSED_SHOWN = 20

const MAX_NAMED_CLAIMANTS = 2

const PROTOCOL_URL =
  'https://github.com/mistakia/nano-community/blob/main/docs/design/task-board-protocol.md'

function TaskCard({ task }) {
  const { Link, task_path } = use_task_board_links()
  const claimants = task.active_claimants
  return (
    <Link className='task-board__card' to={task_path(task.id)}>
      <div className='task-board__card-subject'>
        <TaskTitle subject={task.subject} />
      </div>
      <div className='task-board__card-meta'>
        {task.priority && (
          <span className='task-priority' data-priority={task.priority}>
            {task.priority}
          </span>
        )}
        {task.column === 'closed' ? (
          <span className='task-state'>{task.status}</span>
        ) : (
          task.state &&
          task.state !== 'actionable' && (
            <span className='task-state'>{task.state}</span>
          )
        )}
        {claimants.length > 0 && (
          <span>
            {claimants.length > MAX_NAMED_CLAIMANTS
              ? `${claimants.length} people`
              : claimants.map((pubkey, index) => (
                  <React.Fragment key={pubkey}>
                    {index > 0 && ', '}
                    <PubkeyName pubkey={pubkey} mark_untrusted />
                  </React.Fragment>
                ))}
          </span>
        )}
        {task.comment_count > 0 && (
          <span>
            {task.comment_count}{' '}
            {task.comment_count === 1 ? 'comment' : 'comments'}
          </span>
        )}
        <Age at={task.latest_activity_at} />
      </div>
    </Link>
  )
}

TaskCard.propTypes = {
  task: PropTypes.object.isRequired
}

function BoardColumn({ column, ids, tasks }) {
  const [collapsed, set_collapsed] = useState(
    COLLAPSED_BY_DEFAULT.includes(column)
  )
  const [show_all, set_show_all] = useState(false)
  const shown =
    column === 'closed' && !show_all ? ids.slice(0, CLOSED_SHOWN) : ids
  return (
    <section
      className={`task-board__column${collapsed ? ' task-board__column--collapsed' : ''}`}
      data-column={column}>
      <button
        className='task-board__column-title'
        aria-expanded={!collapsed}
        onClick={() => set_collapsed(!collapsed)}>
        <h2>{COLUMN_TITLES[column]}</h2>
        <span className='task-board__count'>{ids.length}</span>
      </button>
      {!collapsed && (
        <div className='task-board__column-tasks'>
          {ids.length === 0 && <div className='task-board__none'>None</div>}
          {shown.map((id) => (
            <TaskCard key={id} task={tasks[id]} />
          ))}
          {shown.length < ids.length && (
            <button
              type='button'
              className='task-board__more'
              onClick={() => set_show_all(true)}>
              Show all {ids.length}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

BoardColumn.propTypes = {
  column: PropTypes.string.isRequired,
  ids: PropTypes.array.isRequired,
  tasks: PropTypes.object
}

export default function TaskBoard() {
  const { navigate, new_task_path } = use_task_board_links()
  const board = useSelector(get_task_board)
  const state = useSelector(get_task_board_state)
  const has_key = Boolean(useSelector(get_nostr_identity).get('pubkey'))

  if (!board.get('board')) {
    return (
      <div className='task-board__empty'>
        No board is configured yet. Open this page with{' '}
        <code>?board=&lt;owner npub&gt;</code> to view one.
      </div>
    )
  }

  return (
    <div className='task-board'>
      <header className='task-board__header'>
        <div className='task-board__intro'>
          <h1>Community Tasks</h1>
          <p>
            What the Nano community is working on, and what needs someone to
            take it on. Anyone can file a task, pick one up or join the
            discussion.{' '}
            <a href={PROTOCOL_URL} target='_blank' rel='noreferrer'>
              How it works
            </a>
          </p>
        </div>
        <IdentityLink />
      </header>
      {(has_key || !board.get('is_loaded')) && (
        <div className='task-board__toolbar'>
          {has_key && (
            <Button
              variant='outlined'
              onClick={() => navigate && navigate(new_task_path())}>
              File a task
            </Button>
          )}
          {!board.get('is_loaded') && (
            <span className='task-board__loading'>Loading from relays…</span>
          )}
        </div>
      )}
      <div className='task-board__columns'>
        {BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column}
            column={column}
            ids={state ? state.columns[column] : []}
            tasks={state ? state.tasks : {}}
          />
        ))}
      </div>
    </div>
  )
}
