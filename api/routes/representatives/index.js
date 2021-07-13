const express = require('express')
const dayjs = require('dayjs')

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
      .where('last_seen', '>', dayjs().subtract('1', 'month').unix())

    const accounts = representatives.map((r) => r.account)

    /***********************************************************/
    const telemetryQuery = db('representatives_telemetry')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const telemetry = db
      .select('representatives_telemetry.*')
      .from(db.raw('(' + telemetryQuery.toString() + ') AS X'))
      .innerJoin('representatives_telemetry', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    /***********************************************************/
    const uptime = db('representatives_uptime_rollup_2hour')
      .whereIn('account', accounts)
      .orderBy('interval', 'asc')

    /***********************************************************/
    const accountMetaQuery = db('accounts_meta')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const accountMeta = db
      .select('accounts_meta.*')
      .from(db.raw('(' + accountMetaQuery.toString() + ') AS X'))
      .innerJoin('accounts_meta', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    /***********************************************************/
    const repMetaQuery = db('representatives_meta')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const repMeta = db
      .select('representatives_meta.*')
      .from(db.raw('(' + repMetaQuery.toString() + ') AS X'))
      .innerJoin('representatives_meta', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    /***********************************************************/
    const networkQuery = db('representatives_network')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const network = db
      .select('representatives_network.*')
      .from(db.raw('(' + networkQuery.toString() + ') AS X'))
      .innerJoin('representatives_network', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    /***********************************************************/
    const onlineQuery = db('representatives_uptime')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .where({ online: true })
      .groupBy('account')
    const online = db
      .select('representatives_uptime.*')
      .from(db.raw('(' + onlineQuery.toString() + ') AS X'))
      .innerJoin('representatives_uptime', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    /***********************************************************/
    const offlineQuery = db('representatives_uptime')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .where({ online: false })
      .groupBy('account')
    const offline = db
      .select('representatives_uptime.*')
      .from(db.raw('(' + offlineQuery.toString() + ') AS X'))
      .innerJoin('representatives_uptime', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .whereIn('account', accounts)

    const queryResults = await Promise.all([
      accountMeta, // 0
      telemetry, // 1
      uptime, // 2
      network, // 3
      repMeta, // 4
      offline, // 5
      online // 6
    ])

    for (const rep of representatives) {
      rep.account_meta =
        queryResults[0].find((a) => a.account === rep.account) || {}
      rep.representative_meta =
        queryResults[4].find((a) => a.account === rep.account) || {}
      rep.uptime = queryResults[2]
        .filter((a) => a.account === rep.account)
        .map(({ online, interval }) => ({ online, interval }))
      rep.telemetry =
        queryResults[1].find((a) => a.account === rep.account) || {}
      rep.network = queryResults[3].find((a) => a.account === rep.account) || {}

      const lastOnline = queryResults[6].find((a) => a.account === rep.account)
      rep.last_online = lastOnline ? lastOnline.timestamp : 0
      const lastOffline = queryResults[5].find((a) => a.account === rep.account)
      rep.last_offline = lastOffline ? lastOffline.timestamp : 0
    }

    cache.set('representatives', representatives, 60 * 5)
    res.status(200).send(representatives)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.use('/top', top)

module.exports = router
