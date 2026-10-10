import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

import { get_task_board, get_task_board_state } from '@core/task-board'
import IdentityBar from './identity-bar'
import FileTaskForm from './file-task-form'
import { use_task_board_links } from './task-board-links'
import { COLUMN_TITLES, format_age } from './format'

const BOARD_COLUMNS = [
  'in_progress',
  'needs_taker',
  'blocked',
  'triage',
  'draft'
]

function TaskCard({ task }) {
  const { Link, task_path } = use_task_board_links()
  return (
    <Link className='task-board__card' to={task_path(task.id)}>
      <div className='task-board__card-subject'>{task.subject}</div>
      <div className='task-board__card-meta'>
        {task.priority && (
          <span
            className={`task-board__priority task-board__priority--${task.priority}`}>
            {task.priority}
          </span>
        )}
        {task.state && task.state !== 'actionable' && (
          <span className='task-board__chip'>{task.state}</span>
        )}
        {task.active_claimants.length > 0 && (
          <span className='task-board__chip'>
            {task.active_claimants.length} working
          </span>
        )}
        {task.comment_count > 0 && (
          <span className='task-board__chip'>
            {task.comment_count} comments
          </span>
        )}
        <span className='task-board__age'>
          {format_age(task.latest_activity_at)}
        </span>
      </div>
    </Link>
  )
}

TaskCard.propTypes = {
  task: PropTypes.object.isRequired
}

export default function TaskBoard() {
  const { navigate, task_path } = use_task_board_links()
  const board = useSelector(get_task_board)
  const state = useSelector(get_task_board_state)
  const [show_form, set_show_form] = useState(false)

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
      <div className='task-board__header'>
        <h1>Community Tasks</h1>
      </div>
      <IdentityBar />
      <div className='task-board__toolbar'>
        <button onClick={() => set_show_form(!show_form)}>
          {show_form ? 'Cancel' : 'File a task'}
        </button>
        {!board.get('is_loaded') && <span>Loading from relays…</span>}
      </div>
      {show_form && (
        <FileTaskForm
          on_filed={(issue) => {
            set_show_form(false)
            if (navigate) navigate(task_path(issue.id))
          }}
        />
      )}
      <div className='task-board__columns'>
        {BOARD_COLUMNS.map((column) => {
          const ids = state ? state.columns[column] : []
          return (
            <div key={column} className='task-board__column'>
              <div className='task-board__column-title'>
                <h2>{COLUMN_TITLES[column]}</h2>
                <span className='task-board__count'>{ids.length}</span>
              </div>
              <div className='task-board__column-tasks'>
                {ids.map((id) => (
                  <TaskCard key={id} task={state.tasks[id]} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
