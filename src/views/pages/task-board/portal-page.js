import React from 'react'
import PropTypes from 'prop-types'

import Seo from '@components/seo'
import Menu from '@components/menu'
import { TaskBoardLinks } from '@components/task-board'
import use_task_board_init from './use-task-board-init'
import { use_portal_links } from './portal-links'

// The portal frame around a task board view: relay subscription, portal
// routing for links, and the site footer.
export default function TaskBoardPortalPage({
  title,
  description,
  tags = ['tasks', 'nano'],
  children
}) {
  use_task_board_init()
  const links = use_portal_links()
  return (
    <>
      <Seo title={title} description={description} tags={tags} />
      <TaskBoardLinks.Provider value={links}>
        {children}
      </TaskBoardLinks.Provider>
      <div className='task-board__footer'>
        <Menu hideSearch />
      </div>
    </>
  )
}

TaskBoardPortalPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  tags: PropTypes.array,
  children: PropTypes.node
}
