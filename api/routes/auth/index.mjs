import express from 'express'

import register from './register.mjs'
import message from './message.mjs'

const router = express.Router()

router.use('/register', register)
router.use('/message', message)

export default router
