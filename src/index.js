import React from 'react'
import { createRoot } from 'react-dom/client'

import { send_site_event } from '@core/site-events'
import Root from '@views/root'

// Client errors on this site have no other error pipeline, so global handlers
// report them through the site-events collector (see
// user:text/analytics/product-analytics.md). Both handlers skip everything
// during react-snap prerendering and when Global Privacy Control is on.
window.addEventListener('error', (event) => {
  send_site_event('client_error', {
    message: event.message || 'Script error',
    source: event.filename || null
  })
})
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  send_site_event('client_error', {
    message:
      reason && reason.message
        ? reason.message
        : String(reason || 'Unhandled rejection'),
    source: 'unhandledrejection'
  })
})

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app')
  createRoot(rootElement).render(<Root />)
})
