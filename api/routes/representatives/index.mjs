import express from 'express'
import dayjs from 'dayjs'
import cron from 'node-cron'

import db from '#db'
import {
  load_representative_hardware_reports,
  load_representative_power_readings
} from '#libs-server/load-representative-power-inputs.mjs'
import { REPRESENTATIVE_TELEMETRY_SELECT_SQL } from '#libs-server/representative-telemetry-columns.mjs'
import {
  ACCOUNT_META_INDEX_SELECT_SQL,
  REPRESENTATIVE_META_INDEX_SELECT_SQL,
  REPRESENTATIVE_NETWORK_SELECT_SQL
} from '#libs-server/epoch-response-columns.mjs'
import cache from '#api/cache.mjs'
import top from './top.mjs'
import data_view_route from './data-view.mjs'

const router = express.Router()

export const loadRepresentatives = async () => {
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
    .orderByRaw('accounts_meta_index.weight desc nulls last')
    .limit(1000) // TODO - remove limit at some point

  const accounts = representatives.map((r) => r.account)

  // Latest telemetry row per account, derived directly from the
  // representatives_telemetry hypertable. Supersedes the
  // representatives_telemetry_index denormalized cache that existed for MyISAM.
  // The response keeps epoch-seconds telemetry_timestamp and timestamp fields.
  const telemetry = db
    .raw(
      `SELECT DISTINCT ON (account) ${REPRESENTATIVE_TELEMETRY_SELECT_SQL} FROM representatives_telemetry WHERE account = ANY(?) ORDER BY account, observed_at DESC`,
      [accounts]
    )
    .then((r) => r.rows)

  const uptime = db('representatives_uptime_rollup_hour')
    .whereIn('account', accounts)
    .orderBy('interval', 'asc')

  const account_meta = db('accounts_meta_index')
    .select(db.raw(ACCOUNT_META_INDEX_SELECT_SQL))
    .whereIn('account', accounts)

  const rep_meta = db('representatives_meta_index')
    .select(db.raw(REPRESENTATIVE_META_INDEX_SELECT_SQL))
    .whereIn('account', accounts)

  /***********************************************************/
  // Latest network row per account
  const network = db
    .raw(
      `SELECT DISTINCT ON (account) ${REPRESENTATIVE_NETWORK_SELECT_SQL} FROM representatives_network WHERE account = ANY(?) ORDER BY account, observed_at DESC`,
      [accounts]
    )
    .then((r) => r.rows)

  /***********************************************************/
  // Latest uptime observation per account from the representatives_uptime
  // hypertable; bucketed by online flag in JS below. Supersedes the
  // representatives_uptime_index denormalized cache that existed for MyISAM.
  // 7-day LATERAL bound lets Timescale chunk-prune to ~7 daily chunks; the
  // importer writes uptime every 5min for every tracked rep so any rep in
  // the rep list has an observation within the bound.
  const latest_uptime = db
    .raw(
      'SELECT u.account, u.online, extract(epoch from u.observed_at)::integer AS "timestamp" FROM unnest(?::char(65)[]) AS reps(account), LATERAL (SELECT account, online, observed_at FROM representatives_uptime WHERE account = reps.account AND observed_at > now() - interval \'7 days\' ORDER BY observed_at DESC LIMIT 1) u',
      [accounts]
    )
    .then((r) => r.rows)

  const queryResults = await Promise.all([
    account_meta, // 0
    telemetry, // 1
    uptime, // 2
    network, // 3
    rep_meta, // 4
    latest_uptime, // 5
    load_representative_power_readings({ accounts }), // 6
    load_representative_hardware_reports({ accounts }) // 7
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
    rep.power_reading = queryResults[6].get(rep.account) || null
    rep.hardware_report = queryResults[7].get(rep.account) || null

    // Original semantic: latest observation timestamp; bucketed into
    // last_online/last_offline by that observation's online flag.
    const latest = queryResults[5].find((a) => a.account === rep.account)
    rep.last_online = latest && latest.online === 1 ? latest.timestamp : 0
    rep.last_offline = latest && latest.online === 0 ? latest.timestamp : 0
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
router.use('/data-view', data_view_route)

export default router
