import React from 'react'

import { TaskAccount } from '@components/task-board'
import TaskBoardPortalPage from '@pages/task-board/portal-page'

export default function TaskAccountPage() {
  return (
    <TaskBoardPortalPage
      title='Join in'
      description='Take part in the Nano community task board'>
      <TaskAccount />
    </TaskBoardPortalPage>
  )
}
