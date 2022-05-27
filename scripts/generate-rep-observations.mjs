import debug from 'debug'
import dayjs from 'dayjs'

import { isMain, saveData } from '#common'
import db from '#db'

const log = debug('generate-rep-observations')
debug.enable('generate-rep-observations')

const generateRepObseravtions = async () => {
  const start = process.hrtime.bigint()

  // get reps seen in the last month
  const representatives = await db('accounts')
    .select('account', 'alias', 'last_seen')
    .where({ representative: true })
    .where('last_seen', '>', dayjs().subtract('1', 'month').unix())

  let count = 0
  for (const representative of representatives) {
    if (process.stdout.clearLine) {
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write(
        `Processing accounts: ${count++}/${representatives.length}`
      )
    }

    const { account } = representative

    // get latest weight
    const accountMetaQuery = db('accounts_meta')
      .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
      .groupBy('account')
    const accountMeta = await db
      .select('accounts_meta.weight')
      .from(db.raw('(' + accountMetaQuery.toString() + ') AS X'))
      .innerJoin('accounts_meta', function () {
        this.on(function () {
          this.on('account', '=', 'aid')
          this.andOn('timestamp', '=', 'maxtime')
        })
      })
      .where({ account })
    representative.weight = BigInt(accountMeta[0].weight).toString()

    // get latest observation
    const current_observation_re = await db('representatives_telemetry')
      .select('node_id', 'address', 'port')
      .where({ account })
      .orderBy('timestamp', 'desc')
      .limit(1)

    representative.current_observation = current_observation_re[0]

    // get all associated node_ids
    representative.node_ids = await db('representatives_telemetry')
      .select('node_id')
      .where({ account })
      .groupBy('node_id')
      .count('* as observations')

    for (const row of representative.node_ids) {
      const { node_id } = row
      const last_observation = await db('representatives_telemetry')
        .select(
          'major_version',
          'minor_version',
          'patch_version',
          'timestamp',
          'address'
        )
        .where({ node_id, account })
        .orderBy('timestamp', 'desc')
        .limit(1)

      const first_observation = await db('representatives_telemetry')
        .select(
          'major_version',
          'minor_version',
          'patch_version',
          'timestamp',
          'address'
        )
        .where({ node_id, account })
        .orderBy('timestamp', 'asc')
        .limit(1)

      row.last_observation = last_observation[0]
      row.first_observation = first_observation[0]

      // get associated address and timestamp for node_id
      const nodeIdSubQuery = db('representatives_telemetry')
        .select(db.raw('max(timestamp) AS maxtime, address AS aid'))
        .count('* as observations')
        .groupBy('address')
        .where({ node_id })
      row.addresses = await db
        .select(
          'representatives_telemetry.timestamp as last_seen',
          'representatives_telemetry.address',
          'representatives_telemetry.port',
          'X.observations'
        )
        .from(db.raw('(' + nodeIdSubQuery.toString() + ') AS X'))
        .innerJoin('representatives_telemetry', function () {
          this.on(function () {
            this.on('address', '=', 'aid')
            this.andOn('timestamp', '=', 'maxtime')
          })
        })
    }
  }

  await saveData('representative-observations', representatives)

  const end = process.hrtime.bigint()
  log(
    `Generated observations for ${representatives.length} in ${Number(
      (end - start) / BigInt(1e9)
    )} secs`
  )
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await generateRepObseravtions()
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

export default generateRepObseravtions
