import React from 'react'

import { NewTask } from '@components/task-board'
import TaskBoardPortalPage from '@pages/task-board/portal-page'

export default function NewTaskPage() {
  return (
    <TaskBoardPortalPage
      title='File a task'
      description='File a task on the Nano community task board'>
      <NewTask />
    </TaskBoardPortalPage>
  )
}
