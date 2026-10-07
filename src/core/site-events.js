/* global window, document, navigator, fetch, performance, history, localStorage */

// First-party, cookieless site analytics for the nano.community client.
// Contract: user:text/analytics/product-analytics.md.
//
// Nothing is written to the browser and nothing is sent at all when Global
// Privacy Control is on or during react-snap prerendering (the prerender
// browser identifies itself with a user agent containing "ReactSnap").
// Analytics must never break a page, so every failure is swallowed.

const SITE_EVENTS_URL = '/api/site-events'

let first_page_view_sent = false

const should_skip = () => {
  if (typeof navigator === 'undefined') return true
  if (navigator.globalPrivacyControl === true) return true
  if (/reactsnap/i.test(navigator.userAgent || '')) return true
  return false
}

// nano.community authenticates with a Bearer header (src/core/api/service.js).
// The token is read from localStorage; a session object also lives in the redux
// app record, but localStorage is the single source the rest of the client uses.
const session_token = () => {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem('token')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : null
  } catch (e) {
    // stored un-encoded (a bare JWT)
    return raw
  }
}

const post = (body) => {
  const headers = { 'Content-Type': 'application/json' }
  const token = session_token()
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    fetch(SITE_EVENTS_URL, {
      method: 'POST',
      keepalive: true,
      headers,
      body: JSON.stringify(body)
    }).catch(() => {})
  } catch (e) {
    // never break the page
  }
}

const referrer_host = () => {
  if (typeof document === 'undefined' || !document.referrer) return null
  try {
    return new URL(document.referrer).hostname || null
  } catch (e) {
    return null
  }
}

const query_ref_tag = (location) => {
  const search = location && location.search ? location.search : ''
  if (!search) return null
  return new URLSearchParams(search).get('ref')
}

const load_time_milliseconds = () => {
  try {
    const navigation =
      performance.getEntriesByType &&
      performance.getEntriesByType('navigation')[0]
    if (navigation && navigation.loadEventEnd) {
      return Math.round(navigation.loadEventEnd)
    }
    if (performance.timing && performance.timing.loadEventEnd) {
      return Math.round(
        performance.timing.loadEventEnd - performance.timing.navigationStart
      )
    }
  } catch (e) {
    // fall through
  }
  return null
}

// The landing page view carries the referrer host, the ?ref= tag and the
// navigation-to-load time, then strips only ?ref= (keeping other params and the
// #anchor doc pages scroll to) so it never leaks onward.
const send_first_page_view = (location) => {
  const request_path = location.pathname
  const referral_tag = query_ref_tag(location)
  const body = {
    site_event_name: 'page_view',
    request_path,
    referrer_host: referrer_host(),
    referral_tag,
    page_response_milliseconds: null
  }
  const send = () => {
    body.page_response_milliseconds = load_time_milliseconds()
    post(body)
  }
  if (document.readyState === 'complete') {
    send()
  } else {
    window.addEventListener('load', send, { once: true })
  }
  if (referral_tag) {
    const url = new URL(window.location.href)
    url.searchParams.delete('ref')
    history.replaceState(
      history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    )
  }
}

// Called from the router LOCATION_CHANGE saga (src/core/app/sagas.js). The
// first page view waits for the load event so timing has a value; later page
// views send immediately.
export const send_page_view = (location) => {
  if (should_skip()) return
  if (!first_page_view_sent) {
    first_page_view_sent = true
    send_first_page_view(location)
    return
  }
  post({ site_event_name: 'page_view', request_path: location.pathname })
}

export const send_site_event = (name, details) => {
  if (should_skip()) return
  const body = { site_event_name: name }
  if (typeof window !== 'undefined' && window.location) {
    body.request_path = window.location.pathname
  }
  if (details) body.event_details = details
  post(body)
}
