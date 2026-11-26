import debug from 'debug'
import percentile from 'percentile'
import PQueue from 'p-queue'

import db from '#db'
import { isMain } from '#common'

const queue = new PQueue({ concurrency: 10 })
const log = debug('analyze-online-weight')

const percentiles = [0, 25, 50, 75, 100]
const value_types = ['online_weight', 'trended_weight']
const results = Object.fromEntries(
  value_types.map((i) => [
    i,
    Object.fromEntries(percentiles.map((p) => [`p${p}`, Infinity]))
  ])
)

const analyzeOnlineWeight = async () => {
  const rows = await db('voting_weight')
    .select('observed_at')
    .groupBy('observed_at')
  const observed_ats = rows.map((r) => r.observed_at)

  const update = (values, value_type) => {
    const r = results[value_type]
    values.forEach((v, idx) => {
      const key = `p${percentiles[idx]}`
      if (v < r[key]) {
        r[key] = v
      }
    })
  }

  let count = 0
  for (const observed_at of observed_ats) {
    queue.add(async () => {
      if (process.stdout.clearLine) {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`Processing: ${count++}/${observed_ats.length}`)
      }

      const measurements = await db('voting_weight').where(
        'observed_at',
        observed_at
      )
      const online_weight = percentile(
        percentiles,
        measurements.map((p) => BigInt(p.online_stake_total))
      )
      const trended_weight = percentile(
        percentiles,
        measurements.map((p) => BigInt(p.trended_stake_total))
      )

      update(online_weight, 'online_weight')
      update(trended_weight, 'trended_weight')
    })
  }

  await queue.onEmpty()

  log(results)
}

if (isMain(import.meta.url)) {
  debug.enable('analyze-online-weight')
  const main = async () => {
    try {
      await analyzeOnlineWeight()
    } catch (err) {
      log(err)
    }
    process.exit()
  }

  try {
    main()
  } catch (err) {
    log(err)
    process.exit()
  }
}

export default analyzeOnlineWeight
