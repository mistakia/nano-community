import os from 'os'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

import config from '#config'
import request from './request.mjs'

// Reddit deprecated free unauthenticated access to /r/<sub>.json for
// programmatic clients; reads now require an app-only OAuth2 bearer token
// (client_credentials) plus a descriptive User-Agent, and go through
// https://oauth.reddit.com rather than www.reddit.com.
//
// Credentials resolve lazily (never at module load) so importing this file on a
// host without the credential does not throw -- only the actual import job that
// runs on the storage host touches them. Order: config.reddit if present (a dev
// override or a future sops config.production.json stanza), else the host-local
// sops file config.reddit.sops.json in the checkout root (age; base-storage
// holds the identity). The token is memoized until shortly before it expires.

const __dirname = dirname(fileURLToPath(import.meta.url))
const REDDIT_SOPS_FILE = path.join(__dirname, '..', 'config.reddit.sops.json')

let _creds
let _token // { value, expires_at }

const resolve_age_key_file = () =>
  process.env.SOPS_AGE_KEY_FILE ||
  path.join(os.homedir(), '.config', 'sops', 'age', 'keys.txt')

const resolve_creds = () => {
  if (_creds) return _creds

  if (config.reddit && config.reddit.client_id && config.reddit.client_secret) {
    _creds = config.reddit
    return _creds
  }

  const result = spawnSync(
    'sops',
    [
      '--decrypt',
      '--input-type',
      'json',
      '--output-type',
      'json',
      REDDIT_SOPS_FILE
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      env: { ...process.env, SOPS_AGE_KEY_FILE: resolve_age_key_file() }
    }
  )
  if (result.error) {
    throw new Error(
      `reddit credentials: sops not runnable (${result.error.message})`
    )
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim() || `exit ${result.status}`
    throw new Error(`reddit credentials: sops decrypt failed: ${detail}`)
  }

  const parsed = JSON.parse(result.stdout)
  if (!parsed.client_id || !parsed.client_secret) {
    throw new Error(
      'reddit credentials: config.reddit.sops.json missing client_id/client_secret'
    )
  }
  _creds = parsed
  return _creds
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
