import express from 'express'

import events from './events.mjs'
import issues from './issues.mjs'
import discussions from './discussions.mjs'

const router = express.Router()

router.use('/events', events)
router.use('/issues', issues)
router.use('/discussions', discussions)

export default router
