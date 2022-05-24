const debug = require('debug')
const percentile = require('percentile')
const { default: PQueue } = require('p-queue')

const db = require('../db')

const queue = new PQueue({ concurrency: 10 })
const log = debug('analyze-online-weight')
debug.enable('analyze-online-weight')

const percentiles = [0, 25, 50, 75, 100]
const results = {}
const value_types = ['online_weight', 'trended_weight']
value_types.forEach((i) => {
  results[i] = {}
  percentiles.forEach((p) => (results[i][`p${p}`] = Infinity))
})

const main = async () => {
  const rows = await db('voting_weight')
    .select('timestamp')
    .groupBy('timestamp')
  const timestamps = rows.map((r) => r.timestamp)

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
  for (const timestamp of timestamps) {
    queue.add(async () => {
      if (process.stdout.clearLine) {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`Processing: ${count++}/${timestamps.length}`)
      }

      const measurements = await db('voting_weight').where(
        'timestamp',
        timestamp
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

module.exports = main

if (!module.parent) {
  const init = async () => {
    try {
      await main()
    } catch (err) {
      log(err)
    }
    process.exit()
  }

  try {
    init()
  } catch (err) {
    log(err)
    process.exit()
  }
}
