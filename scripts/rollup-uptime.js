const debug = require('debug')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const db = require('../db')
const { groupBy } = require('../common')

const logger = debug('script')
debug.enable('script')

const main = async (days = 1) => {
  // calculate rollup

  let time = dayjs().utc().startOf('day')
  const end = time.subtract(days, 'day')

  do {
    // calculate rollup
    const uptime = await db('representatives_uptime')
      .where('timestamp', '>=', time.unix())
      .where('timestamp', '<', time.add('1', 'day').unix())

    // group by account
    const grouped = groupBy(uptime, 'account')
    const inserts = []

    // process each account
    for (const [account, values] of Object.entries(grouped)) {
      const downtimeStreaks = values.reduce(
        (res, n) => {
          const prev = res[res.length - 1]
          if (n.online) {
            if (prev.count) {
              res[res.length - 1].end = n.timestamp
            }

            res.push({ count: 0, start: n.timestamp, end: n.timestamp })
          } else {
            prev.count = prev.count + 1
            prev.end = n.timestamp
          }
          return res
        },
        [
          {
            count: 0,
            start: time.unix(),
            end: time.unix()
          }
        ]
      )

      /* eslint-disable camelcase */
      let longest_downtime = 0
      if (downtimeStreaks.length) {
        const counts = downtimeStreaks.map((p) => p.count)
        const longestCount = Math.max(...counts)
        const idx = counts.findIndex((i) => i === longestCount)
        const longestItem = downtimeStreaks[idx]
        const start = dayjs.unix(longestItem.start)
        const end = dayjs.unix(longestItem.end)
        longest_downtime = end.diff(start, 'second')
      }

      const online_count = values.filter((p) => p.online).length
      const offline_count = values.length - online_count
      inserts.push({
        account,
        online_count,
        offline_count,
        longest_downtime,
        timestamp: time.unix()
      })
      /* eslint-enable camelcase */
    }

    if (inserts.length) {
      logger(`saving ${inserts.length} rollups`)
      await db('representatives_uptime_rollup_day')
        .insert(inserts)
        .onConflict()
        .merge()
    }

    logger(`processed ${time.format('MM/DD/YYYY')}`)

    time = time.subtract('1', 'day')
  } while (time.isAfter(end))
}

module.exprots = main

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  const init = async () => {
    try {
      await main(argv.days)
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
