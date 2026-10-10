import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Button from '@mui/material/Button'

import { build_task_issue } from '#common/task-board/index.mjs'
import { task_board_actions, get_task_board } from '@core/task-board'
import { get_nostr_identity } from '@core/nostr-identity'
import { use_task_board_links } from './task-board-links'
import { use_go_to_account } from './identity-link'
import { TaskTitle, TaskText } from './task-text'

const PUBLISH_KEY = 'file-task'

// Filing a task one question at a time: the title first, then the details,
// then a preview to publish. Earlier answers stay on the page and editable.
export default function NewTask() {
  const dispatch = useDispatch()
  const { Link, board_path, task_path, account_path, navigate } =
    use_task_board_links()
  const go_to_account = use_go_to_account()
  const has_key = Boolean(useSelector(get_nostr_identity).get('pubkey'))
  const publishing = useSelector(get_task_board).getIn([
    'publishing',
    PUBLISH_KEY
  ])
  const [step, set_step] = useState(1)
  const [subject, set_subject] = useState('')
  const [content, set_content] = useState('')

  const publish = () =>
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
          if (navigate) navigate(task_path(issue.id))
        }
      })
    )

  return (
    <div className='task-detail task-new'>
      <div className='task-detail__top'>
        <Link to={board_path()}>← Community Tasks</Link>
      </div>
      <h1 className='task-detail__subject'>File a task</h1>

      {!has_key ? (
        <p>
          <Link to={account_path()} onClick={go_to_account}>
            Join in
          </Link>{' '}
          first. It takes one click and needs no account.
        </p>
      ) : (
        <>
          <form
            className='task-new__step'
            onSubmit={(event) => {
              event.preventDefault()
              if (subject.trim()) set_step(Math.max(step, 2))
            }}>
            <label htmlFor='task-new-title'>What needs doing?</label>
            <p className='task-new__help'>
              One short line, like: Add a glossary entry for bootstrapping.
            </p>
            <input
              id='task-new-title'
              autoFocus
              value={subject}
              maxLength={200}
              onChange={(event) => set_subject(event.target.value)}
            />
            {step === 1 && (
              <div>
                <Button
                  variant='outlined'
                  type='submit'
                  disabled={!subject.trim()}>
                  Continue
                </Button>
              </div>
            )}
          </form>

          {step >= 2 && (
            <div className='task-new__step'>
              <label htmlFor='task-new-details'>
                How will we know it is done?
              </label>
              <p className='task-new__help'>
                Add what someone picking this up needs: the goal, links, and
                what finished looks like. Optional.
              </p>
              <textarea
                id='task-new-details'
                autoFocus
                rows={6}
                value={content}
                onChange={(event) => set_content(event.target.value)}
              />
              {step === 2 && (
                <div>
                  <Button variant='outlined' onClick={() => set_step(3)}>
                    {content.trim() ? 'Continue' : 'Skip'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step >= 3 && subject.trim() && (
            <section className='task-section task-new__preview'>
              <h3 className='task-section__title'>Preview</h3>
              <div className='task-new__preview-title'>
                <TaskTitle subject={subject.trim()} />
              </div>
              <TaskText content={content} />
              <p className='task-new__help'>
                Once filed, a task cannot be edited. Tasks from people new to
                the board appear on it once a steward vouches for them. Until
                then, anyone with the link can see yours.
              </p>
              <Button
                variant='outlined'
                disabled={publishing?.pending}
                onClick={publish}>
                {publishing?.preparing
                  ? 'Preparing…'
                  : publishing?.pending
                    ? 'Publishing…'
                    : 'File task'}
              </Button>
              {publishing?.error && (
                <div className='task-board__error'>{publishing.error}</div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
