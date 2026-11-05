import config from '#config'
import request from './request.mjs'

// Reddit deprecated free unauthenticated access to /r/<sub>.json for
// programmatic clients; reads now require an app-only OAuth2 bearer token
// (client_credentials) plus a descriptive User-Agent, and go through
// https://oauth.reddit.com rather than www.reddit.com.
//
// Credentials come from the config.reddit stanza ({ client_id, client_secret,
// user_agent }), which only base-storage's sealed config.production.json holds.
// They resolve lazily (never at module load), so importing this file on a host
// without the stanza does not throw; only the import job that uses it does. The
// token is memoized until shortly before it expires.

let _token // { value, expires_at }

const resolve_creds = () => {
  const creds = config.reddit
  if (!creds || !creds.client_id || !creds.client_secret) {
    throw new Error(
      'reddit credentials: config.reddit is missing client_id/client_secret'
    )
  }
  return creds
}

const get_token = async () => {
  if (_token && Date.now() < _token.expires_at) {
    return _token.value
  }

  const { client_id, client_secret, user_agent } = resolve_creds()
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64')

  const res = await request({
    url: 'https://www.reddit.com/api/v1/access_token',
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': user_agent
    },
    body: 'grant_type=client_credentials'
  })

  if (!res || !res.access_token) {
    throw new Error('reddit token fetch: no access_token in response')
  }

  // Refresh a minute early so a long-running job never sends an expired token.
  const ttl_ms = Math.max(0, (res.expires_in || 3600) - 60) * 1000
  _token = { value: res.access_token, expires_at: Date.now() + ttl_ms }
  return _token.value
}

// Fetch a subreddit listing page via app-only OAuth. Returns the same JSON shape
// as the legacy www.reddit.com/r/<sub>.json endpoint ({ data: { after,
// children: [{ data }] } }), so existing formatters/pagination are unchanged.
export const fetchSubredditListing = async (
  subreddit,
  { after, limit = 100 } = {}
) => {
  const token = await get_token()
  const { user_agent } = resolve_creds()
  const url =
    `https://oauth.reddit.com/r/${subreddit}/new.json?limit=${limit}` +
    (after ? `&after=${encodeURIComponent(after)}` : '')

  return request({
    url,
    headers: {
      authorization: `bearer ${token}`,
      'user-agent': user_agent
    }
  })
}

export default fetchSubredditListing
