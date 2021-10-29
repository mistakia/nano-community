const debug = require('debug')
const util = require('util')
const fs = require('fs')
const exec = util.promisify(require('child_process').exec)
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const dayjs = require('dayjs')

const db = require('../db')

const logger = debug('archive')

const dir = '/root/archives'

const zip = async ({ gzFilename, csvFilename }) => {
  logger(`creating zip of ${csvFilename}`)
  const { stdout, stderr } = await exec(
    `tar -zvcf ${dir}/${gzFilename} -C ${dir} ${csvFilename}`
  )
  if (stderr) {
    throw new Error(stderr)
  }
  fs.unlinkSync(`${dir}/${csvFilename}`)
}

const upload = async (gzFilename) => {
  const file = `${dir}/${gzFilename}`
  logger(`uploading ${file}`)
  const { stdout, stderr } = await exec(
    `/root/.google-drive-upload/bin/gupload ${file}`
  )
  if (stderr) {
    throw new Error(stderr)
  }
  fs.unlinkSync(file)
}

const archiveRepresentativesUptime = async () => {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 12 * 7 * 24 // 12 weeks
  const resp = await db.raw(
    `select * from representatives_uptime where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR)`
  )
  const rows = resp[0]
  logger(`archving ${rows} representatives_uptime entries`)
  const filename = `representatives-uptime-archive_${timestamp}`
  const csvFilename = `${filename}.csv`
  const csvWriter = createCsvWriter({
    path: `${dir}/${csvFilename}`,
    header: [
      { id: 'account', title: 'account' },
      { id: 'online', title: 'online' },
      { id: 'timestamp', title: 'timestamp' }
    ]
  })
  await csvWriter.writeRecords(rows)

  const gzFilename = `${filename}.tar.gz`
  await zip({ gzFilename, csvFilename })
  await upload(gzFilename)
  // delete
}

const archiveRepresentativesTelemetry = async () => {
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 6 * 7 * 24 // 6 weeks
  const resp = await db.raw(
    `select * from representatives_telemetry where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR)`
  )
  const rows = resp[0]
  logger(`archving ${rows} representatives_telemetry entries`)
  const filename = `representatives-telemetry-archive_${timestamp}`
  const csvFilename = `${filename}.csv`
  const csvWriter = createCsvWriter({
    path: `${dir}/${csvFilename}`,
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

  const gzFilename = `${filename}.tar.gz`
  await zip({ gzFilename, csvFilename })
  await upload(gzFilename)
  // delete
}

const archivePosts = async () => {}

const main = async () => {
  debug.enable('archive')
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
