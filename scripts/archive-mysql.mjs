import debug from 'debug'
import dayjs from 'dayjs'
import Knex from 'knex'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import db from '#db'
import { isMain } from '#common'
import config from '#config'

const argv = yargs(hideBin(process.argv)).argv
const storage_mysql = Knex(config.storage_mysql)

const logger = debug('archive')
debug.enable('archive')

const archive_table = async ({
  table,
  timestamp_column = 'timestamp',
  retention_hours,
  batch_size = 20000,
  exclude_where = ''
}) => {
  logger(`archiving ${table} (retention: ${retention_hours / 24} days)`)

  const where_clause = `WHERE ${timestamp_column} < UNIX_TIMESTAMP(NOW() - INTERVAL ${retention_hours} HOUR)${exclude_where ? ` AND ${exclude_where}` : ''}`
  const stale_timestamps = await db.raw(
    `SELECT ${timestamp_column}, COUNT(*) as count FROM ${table} ${where_clause} GROUP BY ${timestamp_column} ORDER BY ${timestamp_column} ASC`
  )

  let total_archived = 0
  let current_batch_size = 0
  let timestamps_for_batch = []

  for (const row of stale_timestamps[0]) {
    const ts = row[timestamp_column]
    const count = row.count
    if (current_batch_size + count <= batch_size) {
      timestamps_for_batch.push(ts)
      current_batch_size += count
    } else {
      total_archived += await process_batch(
        table,
        timestamp_column,
        timestamps_for_batch,
        exclude_where
      )
      timestamps_for_batch = [ts]
      current_batch_size = count
    }
  }
  if (timestamps_for_batch.length > 0) {
    total_archived += await process_batch(
      table,
      timestamp_column,
      timestamps_for_batch,
      exclude_where
    )
  }

  logger(`${table}: archived ${total_archived} total rows`)
  return total_archived
}

const process_batch = async (
  table,
  timestamp_column,
  timestamps,
  exclude_where = ''
) => {
  if (!timestamps.length) return 0

  logger(
    `${table}: processing batch of ${timestamps.length} timestamps. ` +
      `Range: ${dayjs.unix(timestamps[0]).format('YYYY-MM-DD HH:mm:ss')} to ${dayjs.unix(timestamps[timestamps.length - 1]).format('YYYY-MM-DD HH:mm:ss')}`
  )

  let query = db(table).whereIn(timestamp_column, timestamps)
  if (exclude_where) {
    query = query.whereRaw(exclude_where)
  }
  const rows = await query.select()
  if (!rows.length) {
    logger(`${table}: no rows to archive`)
    return 0
  }

  // Insert into storage first
  await storage_mysql(table).insert(rows).onConflict().merge()
  logger(`${table}: copied ${rows.length} rows to storage`)

  // Delete from production only after successful insert
  let delete_query = db(table).whereIn(timestamp_column, timestamps)
  if (exclude_where) {
    delete_query = delete_query.whereRaw(exclude_where)
  }
  const count_deleted = await delete_query.del()
  logger(`${table}: removed ${count_deleted} rows from production`)

  return count_deleted
}

const archive_mysql = async ({ batch_size = 20000 }) => {
  const tables = [
    {
      table: 'representatives_uptime',
      timestamp_column: 'timestamp',
      retention_hours: 12 * 7 * 24 // 12 weeks
    },
    {
      table: 'representatives_telemetry',
      timestamp_column: 'timestamp',
      retention_hours: 6 * 7 * 24 // 6 weeks
    },
    {
      table: 'representatives_telemetry_index',
      timestamp_column: 'timestamp',
      retention_hours: 6 * 7 * 24 // 6 weeks
    },
    {
      table: 'posts',
      timestamp_column: 'created_at',
      retention_hours: 6 * 7 * 24, // 6 weeks
      exclude_where: 'id NOT IN (SELECT post_id FROM post_labels)'
    }
  ]

  for (const {
    table,
    timestamp_column,
    retention_hours,
    exclude_where
  } of tables) {
    try {
      await archive_table({
        table,
        timestamp_column,
        retention_hours,
        batch_size,
        exclude_where
      })
    } catch (err) {
      logger(`ERROR archiving ${table}: ${err.message}`)
      console.error(err)
    }
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      const batch_size = argv.batch_size || 20000
      await archive_mysql({ batch_size })
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

export default archive_mysql
