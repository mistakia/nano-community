import debug from 'debug'

import db from '#db'

const logger = debug('calculate-behind')
debug.enable('calculate-behind')

const getMaxBlockCount = (arr) => {
  const blockCounts = arr.map((p) => p.block_count)
  return Math.max(...blockCounts)
}

const getMaxCementedCount = (arr) => {
  const cementedCounts = arr.map((p) => p.cemented_count)
  return Math.max(...cementedCounts)
}

const calculateBehind = async () => {
  const rows = await db('representatives_telemetry')
    .select('timestamp')
    .groupBy('timestamp')
  const timestamps = rows.map((p) => p.timestamp)

  logger(`timestamps to process: ${timestamps.length}`)

  for (const timestamp of timestamps) {
    const telemetries = await db('representatives_telemetry').where({
      timestamp
    })

    logger(`updating telemetry for ${telemetries.length} nodes`)
    const maxBlockCount = getMaxBlockCount(telemetries)
    const maxCementedCount = getMaxCementedCount(telemetries)
    for (const telemetry of telemetries) {
      await db('representatives_telemetry')
        .update({
          block_behind: maxBlockCount - telemetry.block_count,
          cemented_behind: maxCementedCount - telemetry.cemented_count
        })
        .where({
          timestamp,
          node_id: telemetry.node_id,
          account: telemetry.account
        })
    }
  }
}

if (!module.parent) {
  const main = async () => {
    try {
      await calculateBehind()
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

export default calculateBehind
