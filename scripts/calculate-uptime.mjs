import debug from 'debug'
import dayjs from 'dayjs'

import db from '#db'
import { isMain } from '#common'

const logger = debug('calculate-uptime')
debug.enable('calculate-uptime')

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

const calculateUptime = async () => {
  // main
  const reps = await db('accounts').where({ representative: true })

  const sets = [7, 30, 60, 90]

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

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await calculateUptime()
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

export default calculateUptime
