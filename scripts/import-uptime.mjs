import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, groupBy, isMain } from '#common'
import * as config from '#config'
import db from '#db'

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
  const offlineReps = await db('accounts')
    .whereNotIn('account', onlineReps)
    .where({ representative: true })
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
  const uptime = await db('representatives_uptime').where(
    'timestamp',
    '>',
    dayjs().subtract('14', 'days').unix()
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

    if (inserts.length) {
      logger(`saving ${inserts.length} rollups for ${account}`)
      await db('representatives_uptime_rollup_2hour')
        .insert(inserts)
        .onConflict()
        .merge()
    }
  }
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
