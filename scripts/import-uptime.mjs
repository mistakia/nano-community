import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, groupBy, isMain } from '#common'
import * as config from '#config'
import db from '#db'
import { REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT } from '#constants'

const logger = debug('import-uptime')
debug.enable('import-uptime')

const timestamp = Math.round(Date.now() / 1000)
const now = dayjs()

const importUptime = async () => {
  // get representatives online from multiple nodes
  const requests = config.rpcAddresses.map((url) =>
    rpc.representativesOnline({ url })
  )
  const responses = await Promise.allSettled(requests)

  // deduplicate representatives
  const results = {}
  for (const res of responses) {
    if (res.value && !res.value.error) {
      if (Array.isArray(res.value.representatives)) {
        for (const rep of res.value.representatives) {
          results[rep] = true
        }
      } else {
        for (const rep in res.value.representatives) {
          results[rep] = true
        }
      }
    }
  }

  logger(`found ${Object.values(results).length} online reps`)

  const accountInserts = []
  for (const rep in results) {
    accountInserts.push({
      account: rep,
      representative: 1,
      last_seen: timestamp
    })
  }

  // update accounts table
  if (accountInserts.length) {
    logger(`saving/updating ${accountInserts.length} reps`)
    await db('accounts').insert(accountInserts).onConflict().merge()
  }

  // insert into uptime
  const onlineReps = accountInserts.map((p) => p.account)

  // limit to reps with a minimum voting weight
  // hard limit to 10k, sort by voting weight
  const offlineReps = await db('accounts')
    .select('accounts.account')
    .whereNotIn('accounts.account', onlineReps)
    .where({ representative: true })
    .leftJoin(
      'accounts_meta_index',
      'accounts.account',
      '=',
      'accounts_meta_index.account'
    )
    .orderBy('accounts_meta_index.weight', 'desc')
    .where(
      'accounts_meta_index.weight',
      '>=',
      REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT
    )
    .limit(10000)

  const uptimeInserts = []
  for (const rep of onlineReps) {
    uptimeInserts.push({
      account: rep,
      online: 1,
      timestamp
    })
  }
  for (const rep of offlineReps) {
    uptimeInserts.push({
      account: rep.account,
      online: 0,
      timestamp
    })
  }

  if (uptimeInserts.length) {
    logger(`saving uptime for ${uptimeInserts.length} reps`)
    await db('representatives_uptime').insert(uptimeInserts)
    await db('representatives_uptime_index')
      .insert(uptimeInserts)
      .onConflict('account')
      .merge()
  }

  // calculate rollup
  const uptime = await db('representatives_uptime')
    .select('representatives_uptime.*')
    .leftJoin(
      'accounts_meta_index',
      'representatives_uptime.account',
      '=',
      'accounts_meta_index.account'
    )
    .where(
      'representatives_uptime.timestamp',
      '>',
      dayjs().subtract('14', 'days').unix()
    )
    .where(
      'accounts_meta_index.weight',
      '>=',
      REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT
    )

  // group by account
  const grouped = groupBy(uptime, 'account')

  // process each account
  for (const [account, values] of Object.entries(grouped)) {
    // rollup into groups of every two hours
    const rollup = {}
    for (const d of values) {
      const diff = dayjs.unix(d.timestamp).diff(now, 'hour')
      const hour = Math.abs(diff)
      const interval = hour && hour % 2 === 0 ? hour - 1 : hour
      if (!rollup[interval]) rollup[interval] = [d]
      else rollup[interval].push(d)
    }

    const inserts = []
    // calculate uptime for each group
    for (const [interval, items] of Object.entries(rollup)) {
      let online = true
      for (const value of items) {
        if (value.online === 0) {
          online = false
          break
        }
      }
      inserts.push({
        account,
        interval,
        online
      })
    }

    // fill in missing intervals
    for (let i = 0; i < 355; i++) {
      const interval = String(i)
      if (!rollup[interval]) {
        inserts.push({
          account,
          interval,
          online: false
        })
      }
    }

    if (inserts.length) {
      logger(`saving ${inserts.length} rollups for ${account}`)
      await db('representatives_uptime_rollup_2hour')
        .insert(inserts)
        .onConflict()
        .merge()
    }
  }

  // remove rows for representatives without uptime in the last 14 days
  const res = await db('representatives_uptime_rollup_2hour')
    .whereNotIn('account', Object.keys(grouped))
    .delete()

  logger(
    `removed ${res} outdated rollup rows for representatives without uptime in the last 14 days`
  )
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await importUptime()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default importUptime
