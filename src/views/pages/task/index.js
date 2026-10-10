import React from 'react'
import { useParams } from 'react-router-dom'

import Seo from '@components/seo'
import Menu from '@components/menu'
import { TaskDetail, TaskBoardLinks } from '@components/task-board'
import use_task_board_init from '@pages/task-board/use-task-board-init'
import { use_portal_links } from '@pages/task-board/portal-links'

export default function TaskPage() {
  use_task_board_init()
  const links = use_portal_links()
  const { issue_event_id } = useParams()
  return (
    <>
      <Seo
        title='Community Task'
        description='Nano community task'
        tags={['tasks', 'nano']}
      />
      <TaskBoardLinks.Provider value={links}>
        <TaskDetail issue_id={issue_event_id} />
      </TaskBoardLinks.Provider>
      <div className='task-board__footer'>
        <Menu hideSearch />
      </div>
    </>
  )
}
