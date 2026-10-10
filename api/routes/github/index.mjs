import express from 'express'

import events from './events.mjs'
import discussions from './discussions.mjs'

const router = express.Router()

router.use('/events', events)
router.use('/discussions', discussions)

export default router
