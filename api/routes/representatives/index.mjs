import express from 'express'
import dayjs from 'dayjs'
import cron from 'node-cron'

import db from '#db'
import cache from '#api/cache.mjs'
import top from './top.mjs'

const router = express.Router()

const loadRepresentatives = async () => {
  // get reps seen in the last month
  const representatives = await db('accounts')
    .select('accounts.*')
    .where({ representative: true })
    .where('last_seen', '>', dayjs().subtract('1', 'month').unix())
    .leftJoin(
      'accounts_meta_index',
      'accounts.account',
      '=',
      'accounts_meta_index.account'
    )
    .orderBy('accounts_meta_index.weight', 'desc')
    .limit(1000) // TODO - remove limit at some point

  const accounts = representatives.map((r) => r.account)

  const telemetry = db('representatives_telemetry_index').whereIn(
    'account',
    accounts
  )

  const uptime = db('representatives_uptime_rollup_hour')
    .whereIn('account', accounts)
    .orderBy('interval', 'asc')

  const account_meta = db('accounts_meta_index').whereIn('account', accounts)

  const rep_meta = db('representatives_meta_index').whereIn('account', accounts)

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
  const online_query = db('representatives_uptime_index').where({
    online: true
  })
  const online = online_query.whereIn('account', accounts)

  /***********************************************************/
  const offline_query = db('representatives_uptime_index').where({
    online: false
  })
  const offline = offline_query.whereIn('account', accounts)

  const queryResults = await Promise.all([
    account_meta, // 0
    telemetry, // 1
    uptime, // 2
    network, // 3
    rep_meta, // 4
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
    rep.telemetry = queryResults[1].find((a) => a.account === rep.account) || {}
    rep.network = queryResults[3].find((a) => a.account === rep.account) || {}

    const lastOnline = queryResults[6].find((a) => a.account === rep.account)
    rep.last_online = lastOnline ? lastOnline.timestamp : 0
    const lastOffline = queryResults[5].find((a) => a.account === rep.account)
    rep.last_offline = lastOffline ? lastOffline.timestamp : 0
  }

  cache.set('representatives', representatives, 60 * 10)
  return representatives
}

if (process.env.NODE_ENV !== 'test') {
  loadRepresentatives()

  cron.schedule('*/5 * * * *', async () => {
    await loadRepresentatives()
  })
}

router.get('/', async (req, res) => {
  const { logger } = req.app.locals
  try {
    const cachedReps = cache.get('representatives')
    if (cachedReps) {
      return res.status(200).send(cachedReps)
    }

    const representatives = await loadRepresentatives()

    res.status(200).send(representatives)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.use('/top', top)

export default router
