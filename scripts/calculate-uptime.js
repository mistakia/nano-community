const debug = require('debug')
const dayjs = require('dayjs')

const db = require('../db')

const logger = debug('script')
debug.enable('script')

const now = dayjs()
const getUpdate = async ({ account, days }) => {
  const query1 = await db('representatives_uptime')
    .count('* as count')
    .where({ online: 1, account })
    .where('timestamp', '>=', now.subtract(days, 'day').startOf('day').unix())
  const query2 = await db('representatives_uptime')
    .count('* as count')
    .where({ online: 0, account })
    .where('timestamp', '>=', now.subtract(days, 'day').startOf('day').unix())

  return {
    account,
    days,
    online_count: query1[0].count,
    offline_count: query2[0].count
  }
}

const main = async () => {
  // main
  const reps = await db('accounts').where({ representative: true })

  const sets = [7, 30, 60, 90, 120, 240, 365]

  const inserts = []
  for (const { account } of reps) {
    for (const days of sets) {
      const insert = await getUpdate({ account, days })
      inserts.push(insert)
    }
  }

  if (inserts.length) {
    logger(`saving ${inserts.length} summaries for ${reps.length} reps`)
    await db('representatives_uptime_summary')
      .insert(inserts)
      .onConflict()
      .merge()
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
