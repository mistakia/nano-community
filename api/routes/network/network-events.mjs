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

const NETWORK_EVENT_COLUMNS = [
  'network_event_id',
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
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

// Only public types are ever selected: operator-only events stay in the
// database and no route or filter can reach them.
const select_public_network_events = (db) =>
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
    const offset = parse_non_negative_integer(req.query.offset, 0)
    if (offset === null) {
      return res.status(400).send({ error: 'invalid offset' })
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
      offset
    ].join(',')}`
    const cached_events = cache.get(cache_key)
    if (cached_events) {
      return res.status(200).send(cached_events)
    }

    const query = select_public_network_events(db)
      .orderBy([
        { column: 'observed_at', order: 'desc' },
        { column: 'network_event_id', order: 'asc' }
      ])
      .limit(page_limit)
      .offset(offset)
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
