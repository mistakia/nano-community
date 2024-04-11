import express from 'express'

import register from './register.mjs'
import message from './message.mjs'
import revoke from './revoke.mjs'

const router = express.Router()

router.use('/register', register)
router.use('/message', message)
router.use('/revoke', revoke)

export default router
