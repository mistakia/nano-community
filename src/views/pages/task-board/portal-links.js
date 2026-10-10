import React from 'react'
import PropTypes from 'prop-types'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

function PortalLink({ to, children, ...props }) {
  return (
    <RouterLink to={to} {...props}>
      {children}
    </RouterLink>
  )
}

PortalLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node
}

const board_query = () => {
  const params = new URLSearchParams(window.location.search)
  const kept = new URLSearchParams()
  for (const key of ['board', 'relays']) {
    if (params.get(key)) kept.set(key, params.get(key))
  }
  const query = kept.toString()
  return query ? `?${query}` : ''
}

// Keeps a board or relays override in the URL while navigating the portal.
export function use_portal_links() {
  const navigate = useNavigate()
  return {
    task_path: (issue_id) => `/task/${issue_id}${board_query()}`,
    board_path: () => `/roadmap${board_query()}`,
    navigate,
    Link: PortalLink
  }
}
