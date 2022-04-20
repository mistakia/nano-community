const express = require('express')

const events = require('./events')
const issues = require('./issues')
const discussions = require('./discussions')

const router = express.Router()

router.use('/events', events)
router.use('/issues', issues)
router.use('/discussions', discussions)

module.exports = router
