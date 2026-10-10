import React, { createContext, useContext } from 'react'
import PropTypes from 'prop-types'

export function AnchorLink({ to, children, ...props }) {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  )
}

AnchorLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node
}

// The portal routes with react-router; the standalone client routes with the
// URL fragment. Views link through this context so both builds share them.
const default_links = {
  task_path: (issue_id) => `#/task/${issue_id}`,
  board_path: () => '#/',
  account_path: () => '#/account',
  new_task_path: () => '#/new',
  current_path: () => window.location.hash,
  Link: AnchorLink
}

export const TaskBoardLinks = createContext(default_links)
export const use_task_board_links = () => useContext(TaskBoardLinks)
