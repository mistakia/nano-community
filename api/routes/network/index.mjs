import express from 'express'

import network_events from './network-events.mjs'
import network_stats from './network-stats.mjs'

const router = express.Router()

router.use('/events', network_events)
router.use('/', network_stats)

export default router
