import debug from 'debug'
// import yargs from 'yargs'
// import { hideBin } from 'yargs/helpers'
import Knex from 'knex'

/* eslint-disable no-unused-vars */
// import db from '#db'
import { isMain } from '#common'
/* eslint-enable no-unused-vars */
import * as config from '#config'

// const argv = yargs(hideBin(process.argv)).argv
const log = debug('migrate-rows')
debug.enable('migrate-rows')

const db = Knex(config.mysql)

const migrate_rows = async () => {
  const one_hour_in_seconds = 3600

  const min_timestamp_query_response = await db('representatives_uptime').min(
    'timestamp as min_timestamp'
  )
  const max_timestamp_query_response = await db('representatives_uptime').max(
    'timestamp as max_timestamp'
  )
  const end_timestamp = min_timestamp_query_response[0].min_timestamp
  const start_timestamp = max_timestamp_query_response[0].max_timestamp

  log(`Min timestamp: ${end_timestamp}, Max timestamp: ${start_timestamp}`)

  let current_timestamp = start_timestamp

  while (current_timestamp > end_timestamp) {
    log(
      `Migrating rows from ${current_timestamp} to ${
        current_timestamp + one_hour_in_seconds
      }`
    )
    const next_timestamp = current_timestamp - one_hour_in_seconds
    const query = `
    INSERT INTO \`representatives_uptime_index\` (\`account\`, \`online\`, \`timestamp\`)
    SELECT
        representatives_uptime.account,
        representatives_uptime.online,
        representatives_uptime.timestamp
    FROM
        representatives_uptime
    INNER JOIN (
        SELECT
            account,
            online,
            MAX(timestamp) AS latest_timestamp
        FROM
            representatives_uptime
        WHERE timestamp BETWEEN ${next_timestamp} AND ${current_timestamp}
        GROUP BY
            account, online
    ) AS latest ON representatives_uptime.account = latest.account AND representatives_uptime.online = latest.online AND representatives_uptime.timestamp = latest.latest_timestamp
    ON DUPLICATE KEY UPDATE
        \`online\` = VALUES(\`online\`),
        \`representatives_uptime_index\`.timestamp = GREATEST(\`representatives_uptime_index\`.timestamp, VALUES(\`timestamp\`));
  `
    const result = await db.raw(query)
    console.log(result)
    const result_set = result[0]
    log(
      `Changed: ${result_set.changedRows}, Affected: ${result_set.affectedRows}`
    )
    current_timestamp = next_timestamp
  }
}

const main = async () => {
  let error
  try {
    await migrate_rows()
  } catch (err) {
    error = err
    log(error)
  }

  // await db('jobs').insert({
  //   type: constants.jobs.EXAMPLE,
  //   succ: error ? 0 : 1,
  //   reason: error ? error.message : null,
  //   timestamp: Math.round(Date.now() / 1000)
  // })

  process.exit()
}

if (isMain(import.meta.url)) {
  main()
}

export default migrate_rows
