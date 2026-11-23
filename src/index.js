import React from 'react'
import { createRoot } from 'react-dom/client'

import { send_site_event } from '@core/site-events'
import Root from '@views/root'
import { preload_route } from '@views/routes'

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

// Resolve the current route chunk first, so the first render replaces the
// prerendered DOM with the same page instead of a Suspense fallback.
const route_ready = Promise.resolve(
  preload_route(window.location.pathname)
).catch(() => {})
document.addEventListener('DOMContentLoaded', async () => {
  await route_ready
  const rootElement = document.getElementById('app')
  createRoot(rootElement).render(<Root />)
})
