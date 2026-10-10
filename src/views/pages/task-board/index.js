import React from 'react'

import { TaskBoard } from '@components/task-board'
import TaskBoardPortalPage from './portal-page'
import CommunityDiscussions from './community-discussions'

import './task-board-page.styl'

export default function TaskBoardPage() {
  return (
    <TaskBoardPortalPage
      title='Community Tasks'
      description='Nano community task board: what is being worked on and what needs a taker'
      tags={['roadmap', 'nano', 'tasks', 'community', 'nostr']}>
      <TaskBoard />
      <CommunityDiscussions />
    </TaskBoardPortalPage>
  )
}
