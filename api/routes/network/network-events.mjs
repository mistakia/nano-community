import express from 'express'

import {
  NETWORK_EVENT_SEVERITIES,
  PUBLIC_NETWORK_EVENT_TYPES
} from '#common/network-event-types.mjs'

const router = express.Router()

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50
const CACHE_SECONDS = 60
const ACCOUNT_RE = /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/
const NETWORK_EVENT_ID_RE = /^[0-9a-f]{64}$/

export const NETWORK_EVENT_COLUMNS = [
  'network_event_sequence',
  'network_event_id',
  'network_event_condition_id',
  'network_event_type',
  'network_event_phase',
  'severity',
  'representative_account',
  'peer_address',
  'node_id',
  'evidence',
  'observed_at',
  'recorded_at'
]

const parse_non_negative_integer = (value, fallback) => {
  if (value === undefined) return fallback
  if (typeof value !== 'string') return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

// Only public types are ever selected: operator-only events stay in the
// database and no route or filter can reach them.
export const select_public_network_events = (db) =>
  db('network_events')
    .select(NETWORK_EVENT_COLUMNS)
    .whereIn('network_event_type', PUBLIC_NETWORK_EVENT_TYPES)

router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { network_event_type, representative_account, severity } = req.query

    const limit = parse_non_negative_integer(req.query.limit, DEFAULT_LIMIT)
    if (limit === null || limit < 1) {
      return res.status(400).send({ error: 'invalid limit' })
    }
    // Cursors on network_event_sequence, which is assigned in commit order:
    // after reads forward and loses nothing, before reads back from the
    // newest page.
    const after = parse_non_negative_integer(req.query.after, null)
    const before = parse_non_negative_integer(req.query.before, null)
    if (after === null && req.query.after !== undefined) {
      return res.status(400).send({ error: 'invalid after' })
    }
    if (before === null && req.query.before !== undefined) {
      return res.status(400).send({ error: 'invalid before' })
    }
    if (after !== null && before !== null) {
      return res.status(400).send({ error: 'use either after or before' })
    }
    if (
      network_event_type !== undefined &&
      !PUBLIC_NETWORK_EVENT_TYPES.includes(network_event_type)
    ) {
      return res.status(400).send({ error: 'invalid network_event_type' })
    }
    if (
      representative_account !== undefined &&
      !ACCOUNT_RE.test(representative_account)
    ) {
      return res.status(400).send({ error: 'invalid representative_account' })
    }
    if (
      severity !== undefined &&
      !NETWORK_EVENT_SEVERITIES.includes(severity)
    ) {
      return res.status(400).send({ error: 'invalid severity' })
    }
    const page_limit = Math.min(limit, MAX_LIMIT)

    const cache_key = `/api/network/events/${[
      network_event_type,
      representative_account,
      severity,
      page_limit,
      after,
      before
    ].join(',')}`
    const cached_events = cache.get(cache_key)
    if (cached_events) {
      return res.status(200).send(cached_events)
    }

    const query = select_public_network_events(db)
      .orderBy('network_event_sequence', after === null ? 'desc' : 'asc')
      .limit(page_limit)
    if (after !== null) query.where('network_event_sequence', '>', after)
    if (before !== null) query.where('network_event_sequence', '<', before)
    if (network_event_type) query.where({ network_event_type })
    if (representative_account) query.where({ representative_account })
    if (severity) query.where({ severity })

    const network_events = await query

    cache.set(cache_key, network_events, CACHE_SECONDS)
    res.status(200).send(network_events)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.get('/:network_event_id', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { network_event_id } = req.params
    if (!NETWORK_EVENT_ID_RE.test(network_event_id)) {
      return res.status(404).send({ error: 'network event not found' })
    }

    const cache_key = `/api/network/events/${network_event_id}`
    const cached_event = cache.get(cache_key)
    if (cached_event) {
      return res.status(200).send(cached_event)
    }

    const network_event = await select_public_network_events(db)
      .where({ network_event_id })
      .first()
    if (!network_event) {
      return res.status(404).send({ error: 'network event not found' })
    }

    cache.set(cache_key, network_event, CACHE_SECONDS)
    res.status(200).send(network_event)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
