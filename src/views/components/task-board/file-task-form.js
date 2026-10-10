import React, { useState } from 'react'
import PropTypes from 'prop-types'
import Button from '@mui/material/Button'
import { useDispatch, useSelector } from 'react-redux'

import { build_task_issue } from '#common/task-board/index.mjs'
import { task_board_actions, get_task_board } from '@core/task-board'

const PUBLISH_KEY = 'file-task'

export default function FileTaskForm({ on_filed }) {
  const dispatch = useDispatch()
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    PUBLISH_KEY
  ])
  const [subject, set_subject] = useState('')
  const [content, set_content] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!subject.trim()) return
    dispatch(
      task_board_actions.publish({
        key: PUBLISH_KEY,
        build: (board) =>
          build_task_issue({
            board,
            subject: subject.trim(),
            content: content.trim()
          }),
        on_published: (issue) => {
          set_subject('')
          set_content('')
          if (on_filed) on_filed(issue)
        }
      })
    )
  }

  return (
    <form className='task-section task-board__file-form' onSubmit={submit}>
      <input
        placeholder='Task title'
        value={subject}
        maxLength={200}
        onChange={(event) => set_subject(event.target.value)}
      />
      <textarea
        placeholder='What needs doing, and how will we know it is done?'
        value={content}
        rows={5}
        onChange={(event) => set_content(event.target.value)}
      />
      <Button
        variant='outlined'
        type='submit'
        disabled={publishing?.pending || !subject.trim()}>
        {publishing?.pending ? 'Publishing…' : 'File task'}
      </Button>
      {publishing?.error && (
        <div className='task-board__error'>{publishing.error}</div>
      )}
      <div className='task-board__hint'>
        Tasks from people new to the board appear on it once a steward vouches
        for them. Until then, anyone with the link can see yours.
      </div>
    </form>
  )
}

FileTaskForm.propTypes = {
  on_filed: PropTypes.func
}
