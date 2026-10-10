import React from 'react'

import Seo from '@components/seo'
import Menu from '@components/menu'
import { TaskBoard, TaskBoardLinks } from '@components/task-board'
import use_task_board_init from './use-task-board-init'
import { use_portal_links } from './portal-links'
import CommunityDiscussions from './community-discussions'

import './task-board-page.styl'

export default function TaskBoardPage() {
  use_task_board_init()
  const links = use_portal_links()
  return (
    <>
      <Seo
        title='Community Tasks'
        description='Nano community task board: what is being worked on and what needs a taker'
        tags={['roadmap', 'nano', 'tasks', 'community', 'nostr']}
      />
      <TaskBoardLinks.Provider value={links}>
        <TaskBoard />
      </TaskBoardLinks.Provider>
      <CommunityDiscussions />
      <div className='task-board__footer'>
        <Menu hideSearch />
      </div>
    </>
  )
}
