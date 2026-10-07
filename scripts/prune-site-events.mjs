import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const logger = debug('prune-site-events')
debug.enable('prune-site-events')

// Raw site events are retained 180 days per user:text/analytics/product-analytics.md.
const RETENTION_DAYS = 180

// Run daily via server/server-crontab (`yarn load:crontab`). --dry-run prints
// the count it would delete without deleting.
const prune_site_events = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000)

  const { count } = await db('site_events')
    .where('occurred_at', '<', cutoff)
    .count('* as count')
    .first()

  logger(`${count} site_events rows older than ${RETENTION_DAYS} days`)

  if (argv['dry-run']) {
    process.stdout.write(
      `DRY_RUN site_events: would delete ${count} rows older than ${RETENTION_DAYS} days\n`
    )
    return
  }

  if (Number(count) > 0) {
    await db('site_events').where('occurred_at', '<', cutoff).del()
  }
  process.stdout.write(
    `SITE_EVENTS_PRUNE_DELETED ${count} rows older than ${RETENTION_DAYS} days\n`
  )
}

if (isMain(import.meta.url)) {
  const main = async () => {
    let error
    try {
      await prune_site_events()
    } catch (err) {
      error = err
      logger(error)
    }
    process.exit(error ? 1 : 0)
  }

  try {
    main()
  } catch (err) {
    logger(err)
    process.exit(1)
  }
}
