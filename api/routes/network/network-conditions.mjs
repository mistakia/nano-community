import express from 'express'

import { select_public_network_events } from './network-events.mjs'

const router = express.Router()

const CACHE_SECONDS = 60
const ACCOUNT_RE = /^nano_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/

// Open conditions: public began rows with no ended row sharing their
// condition id. producer_coverage gives each producer's latest covered time,
// so a consumer can tell a stale producer from a healthy representative.
router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { representative_account } = req.query
    if (
      representative_account !== undefined &&
      !ACCOUNT_RE.test(representative_account)
    ) {
      return res.status(400).send({ error: 'invalid representative_account' })
    }

    const cache_key = `/api/network/conditions/${representative_account || ''}`
    const cached_conditions = cache.get(cache_key)
    if (cached_conditions) {
      return res.status(200).send(cached_conditions)
    }

    const query = select_public_network_events(db)
      .where({ network_event_phase: 'began' })
      .whereNotExists(
        db('network_events as ended_events')
          .where('ended_events.network_event_phase', 'ended')
          .whereRaw(
            'ended_events.network_event_condition_id = network_events.network_event_condition_id'
          )
      )
      .orderBy('network_event_sequence', 'desc')
    if (representative_account) query.where({ representative_account })

    const [network_conditions, producer_coverage] = await Promise.all([
      query,
      db('network_event_coverage')
        .select('producer')
        .max('coverage_ended_at as coverage_ended_at')
        .groupBy('producer')
        .orderBy('producer')
    ])

    const response = { network_conditions, producer_coverage }
    cache.set(cache_key, response, CACHE_SECONDS)
    res.status(200).send(response)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
