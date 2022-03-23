const debug = require('debug')

const logger = debug('script')
debug.enable('script')
const db = require('../db')

const getMaxBlockCount = (arr) => {
  const blockCounts = arr.map((p) => p.block_count)
  return Math.max(...blockCounts)
}

const getMaxCementedCount = (arr) => {
  const cementedCounts = arr.map((p) => p.cemented_count)
  return Math.max(...cementedCounts)
}

const main = async () => {
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

module.exports = main

if (!module.parent) {
  const init = async () => {
    try {
      await main()
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
