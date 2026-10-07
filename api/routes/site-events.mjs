import crypto from 'crypto'

import express from 'express'

import db from '#db'
import { isbot } from 'isbot'

const router = express.Router()

const ALLOWED_EVENT_NAMES = new Set(['page_view', 'client_error'])

// Paths that carry identifying values are normalized before storage so
// analysis never stores a spendable Nano address or a block hash. The regexes
// follow src/views/pages/dynamic/index.js (ACCOUNT_REGEX / BLOCK_REGEX), with
// the block regex widened to lowercase hex so no hash form slips through.
const normalize_path = (request_path) =>
  request_path.split('/').map(normalize_segment).join('/')

const normalize_segment = (segment) => {
  if (
    /^(?:nano_|xrb_)[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/.test(segment)
  ) {
    return ':account'
  }
  if (/^[0-9A-Fa-f]{64}$/.test(segment)) {
    return ':block'
  }
  return segment
}

const device_type_for = (user_agent) => {
  const ua = (user_agent || '').toLowerCase()
  if (/ipad|kindle|silk|playbook|tablet/.test(ua)) {
    return 'tablet'
  }
  if (/android/.test(ua) && !/mobile/.test(ua)) {
    return 'tablet'
  }
  if (/mobi|iphone|ipod|blackberry|iemobile|opera mini|android/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

const today_utc = () => new Date().toISOString().slice(0, 10)

// The day's hash key: created when the date rolls over, with every older key
// deleted in the same step, so one day's counts stay stable and past days can
// never be recomputed (see user:text/analytics/product-analytics.md).
const get_or_create_hash_key = async () => {
  const hash_key_date = today_utc()
  const existing = await db('site_client_hash_keys')
    .select('hash_key')
    .where({ hash_key_date })
    .first()
  if (existing) {
    return existing.hash_key
  }

  const hash_key = crypto.randomBytes(32).toString('hex')
  await db.transaction(async (trx) => {
    await trx('site_client_hash_keys')
      .insert({ hash_key_date, hash_key })
      .onConflict('hash_key_date')
      .ignore()
    await trx('site_client_hash_keys').whereNot({ hash_key_date }).del()
  })
  const created = await db('site_client_hash_keys')
    .select('hash_key')
    .where({ hash_key_date })
    .first()
  return created.hash_key
}

// SHA-256 of the day's hash key, the client IP and the user agent, truncated
// to 16 hex characters. The IP is never stored.
const anonymous_client_hash = ({ hash_key, ip, user_agent }) =>
  crypto
    .createHash('sha256')
    .update(`${hash_key}${ip}${user_agent}`)
    .digest('hex')
    .slice(0, 16)

// Never throws and never fails the request: analytics must not break a page.
router.post('/', async (req, res) => {
  try {
    const {
      site_event_name,
      request_path = '',
      referrer_host = null,
      referral_tag = null,
      page_response_milliseconds = null,
      event_details = null
    } = req.body || {}

    if (!ALLOWED_EVENT_NAMES.has(site_event_name)) {
      return res.status(400).json({ error: 'invalid site_event_name' })
    }

    const client_ip =
      req.headers['cf-connecting-ip'] ||
      (req.connection && req.connection.remoteAddress) ||
      'unknown'
    const user_agent = req.get('user-agent') || ''
    const hash_key = await get_or_create_hash_key()

    await db('site_events').insert({
      occurred_at: new Date(),
      site_event_name,
      request_path: normalize_path(request_path),
      referrer_host: referrer_host || null,
      referral_tag: referral_tag || null,
      anonymous_client_hash: anonymous_client_hash({
        hash_key,
        ip: client_ip,
        user_agent
      }),
      is_authenticated: Boolean(req.auth),
      is_bot_user_agent: isbot(user_agent),
      device_type: device_type_for(user_agent),
      page_response_milliseconds: page_response_milliseconds || null,
      event_details: event_details || null
    })

    res.status(201).json({ ok: true })
  } catch (error) {
    req.app.locals.logger(error)
    res.status(201).json({ ok: true })
  }
})

export default router
