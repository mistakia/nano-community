const debug = require('debug')

const { request, rpc } = require('../common')
const config = require('../config')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const timestamp = Math.round(Date.now() / 1000)
const main = async () => {
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
  }
}

module.exprots = main

if (!module.parent) {
  const init = async () => {
    try {
      await main()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
