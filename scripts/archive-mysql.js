const debug = require('debug')
const util = require('util')
const fs = require('fs')
const exec = util.promisify(require('child_process').exec)
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const dayjs = require('dayjs')

const db = require('../db')

const logger = debug('archive')
debug.enable('archive')

const dir = '/root/archives'

const zip = async ({ qzFilename, csvFilename }) => {
  const { stdout, stderr } = await exec(
    `tar -zvcf ${qzFilename} ${csvFilename}`
  )
  console.log(stderr)
  fs.unlinkSync(csvFilename)
}

const upload = async (qzFilename) => {
  const { stdout, stderr } = await exec(
    `/root/.google-drive-upload/bin/gupload ${qzFilename}`
  )
  console.log(stderr)
  fs.unlinkSync(qzFilename)
}

const archiveRepresentativesUptime = async () => {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 12 * 7 * 24 // 12 weeks
  const resp = await db.raw(
    `select * from representatives_uptime where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR)`
  )
  const rows = resp[0]
  const filename = `${dir}/representatives-uptime-archive_${timestamp}`
  const csvFilename = `${filename}.csv`
  const csvWriter = createCsvWriter({
    path: csvFilename,
    header: [
      { id: 'account', title: 'account' },
      { id: 'online', title: 'online' },
      { id: 'timestamp', title: 'timestamp' }
    ]
  })
  await csvWriter.writeRecords(rows)

  const qzFilename = `${filename}.tar.qz`
  await zip({ qzFilename, csvFilename })
  await upload(qzFilename)
  // delete
}

const archiveRepresentativesTelemetry = async () => {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 6 * 7 * 24 // 6 weeks
  const resp = await db.raw(
    `select * from representatives_telemetry where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR)`
  )
  const rows = resp[0]
  const filename = `${dir}/representatives-telemetry-archive_${timestamp}`
  const csvFilename = `${filename}.csv`
  const csvWriter = createCsvWriter({
    path: csvFilename,
    header: [
      { id: 'account', title: 'account' },
      { id: 'weight', title: 'weight' },
      { id: 'block_count', title: 'block_count' },
      { id: 'block_behind', title: 'block_behind' },
      { id: 'cemented_count', title: 'cemented_count' },
      { id: 'cemented_behind', title: 'cemented_behind' },
      { id: 'unchecked_count', title: 'unchecked_count' },
      { id: 'bandwidth_cap', title: 'bandwidth_cap' },
      { id: 'peer_count', title: 'peer_count' },
      { id: 'protocol_version', title: 'protocol_version' },
      { id: 'uptime', title: 'uptime' },
      { id: 'major_version', title: 'major_version' },
      { id: 'minor_version', title: 'minor_version' },
      { id: 'patch_version', title: 'patch_version' },
      { id: 'pre_release_version', title: 'pre_release_version' },
      { id: 'maker', title: 'maker' },
      { id: 'node_id', title: 'node_id' },
      { id: 'address', title: 'address' },
      { id: 'port', title: 'port' },
      { id: 'telemetry_timestamp', title: 'telemetry_timestamp' },
      { id: 'timestamp', title: 'timestamp' }
    ]
  })
  await csvWriter.writeRecords(rows)

  const qzFilename = `${filename}.tar.qz`
  await zip({ qzFilename, csvFilename })
  await upload(qzFilename)
  // delete
}

const archivePosts = async () => {}

const main = async () => {
  try {
    await archiveRepresentativesUptime()
  } catch (err) {
    console.log(err)
  }

  try {
    await archiveRepresentativesTelemetry()
  } catch (err) {
    console.log(err)
  }
}

module.exprots = main

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
