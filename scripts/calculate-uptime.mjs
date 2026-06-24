import debug from 'debug'
import dayjs from 'dayjs'

import db from '#db'
import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'

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
    // PostgreSQL caps a single bind message at 65535 parameters. At 4 columns
    // per row, one insert of every summary (~159k rows) sends ~635k params and
    // fails with 08P01 (exec_bind_message protocol violation). Chunk the upsert
    // to stay well under the limit.
    const chunk_size = 5000
    for (let i = 0; i < inserts.length; i += chunk_size) {
      await db('representatives_uptime_summary')
        .insert(inserts.slice(i, i + chunk_size))
        .onConflict(['account', 'days'])
        .merge()
    }
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await calculateUptime()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-calculate-uptime',
      success: !error,
      reason: error ? error.message : null,
      duration_ms: Date.now() - start_time
    })

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
