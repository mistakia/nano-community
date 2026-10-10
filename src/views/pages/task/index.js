import React from 'react'
import { useParams } from 'react-router-dom'

import { TaskDetail } from '@components/task-board'
import TaskBoardPortalPage from '@pages/task-board/portal-page'

export default function TaskPage() {
  const { issue_event_id } = useParams()
  return (
    <TaskBoardPortalPage
      title='Community Task'
      description='Nano community task'>
      <TaskDetail issue_id={issue_event_id} />
    </TaskBoardPortalPage>
  )
}
