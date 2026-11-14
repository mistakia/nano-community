import express from 'express'

import network_events from './network-events.mjs'
import network_conditions from './network-conditions.mjs'
import network_stats from './network-stats.mjs'

const router = express.Router()

router.use('/events', network_events)
router.use('/conditions', network_conditions)
router.use('/', network_stats)

export default router
