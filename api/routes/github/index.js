const express = require('express')

const events = require('./events')
const issues = require('./issues')

const router = express.Router()

router.use('/events', events)
router.use('/issues', issues)

module.exports = router
