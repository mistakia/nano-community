const express = require('express')
const moment = require('moment')

const top = require('./top')

const router = express.Router()

router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cachedReps = cache.get('representatives')
    if (cachedReps) {
      return res.status(200).send(cachedReps)
    }

    // get reps seen in the last month
    const representatives = await db('accounts')
      .where({ representative: true })
      .where('last_seen', '>', moment().subtract('1', 'month').unix())

    const accounts = representatives.map((r) => r.account)

    const telemetryQuery = db('representatives_telemetry')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const telemetry = await db
      .select('representatives_telemetry.*')
      .from(db.raw('(' + telemetryQuery.toString() + ') AS X'))
      .innerJoin('representatives_telemetry', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    const uptime = await db('representatives_uptime_rollup_2hour')
      .whereIn('account', accounts)
      .orderBy('interval', 'asc')

    const metaQuery = db('representatives_meta')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const meta = await db
      .select('representatives_meta.*')
      .from(db.raw('(' + metaQuery.toString() + ') AS X'))
      .innerJoin('representatives_meta', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    const networkQuery = db('representatives_network')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const network = await db
      .select('representatives_network.*')
      .from(db.raw('(' + networkQuery.toString() + ') AS X'))
      .innerJoin('representatives_network', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    for (const rep of representatives) {
      rep.meta = meta.find((a) => a.account === rep.account) || {}
      rep.uptime = uptime
        .filter((a) => a.account === rep.account)
        .map(({ online, interval }) => ({ online, interval }))
      rep.telemetry = telemetry.find((a) => a.account === rep.account) || {}
      rep.network = network.find((a) => a.account === rep.account) || {}
    }

    cache.set('representatives', representatives, 60)
    res.status(200).send(representatives)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.use('/top', top)

module.exports = router
