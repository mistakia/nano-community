import debug from 'debug'
import util from 'util'
import fs from 'fs'
import { exec } from 'child_process'
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'
import dayjs from 'dayjs'
import Knex from 'knex'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import db from '#db'
import { isMain } from '#common'
import * as config from '#config'

const argv = yargs(hideBin(process.argv)).argv
const storage_mysql = Knex(config.storage_mysql)

const execp = util.promisify(exec)
const logger = debug('archive')
debug.enable('archive')

const dir = '/home/user/nano-community-archives'

// const zip = async ({ gzFilename, csvFilename }) => {
//   logger(`creating zip of ${csvFilename}`)
//   const { stderr } = await exec(
//     `tar -zvcf ${dir}/${gzFilename} -C ${dir} ${csvFilename}`
//   )
//   if (stderr) {
//     logger(stderr)
//     throw new Error(stderr)
//   }
//   fs.unlinkSync(`${dir}/${csvFilename}`)
// }

const upload = async (gzFilename) => {
  const file = `${dir}/${gzFilename}`
  logger(`uploading ${file}`)
  const { stderr } = await execp(
    `/home/user/.google-drive-upload/bin/gupload ${file}`
  )
  if (stderr) {
    throw new Error(stderr)
  }
  fs.unlinkSync(file)
}

const archive_representatives_uptime = async ({ batch_size = 10000 }) => {
  logger('archiving representatives_uptime')
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 12 * 7 * 24 // 12 weeks
  let offset = 0
  let rows = []
  do {
    const resp = await db.raw(
      `select * from representatives_uptime where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR) limit ${batch_size} offset ${offset}`
    )
    rows = resp[0]
    if (!rows.length) {
      logger('no rows to archive')
      return
    }

    await storage_mysql('representatives_uptime')
      .insert(rows)
      .onConflict()
      .merge()
    logger(`copied ${rows.length} rows to storage_mysql`)

    logger(`archving ${rows.length} representatives_uptime entries`)
    const filename = `representatives-uptime-archive_${timestamp}`
    const csv_filename = `${filename}.csv`
    const csv_writer = createCsvWriter({
      path: `${dir}/${csv_filename}`,
      header: [
        { id: 'account', title: 'account' },
        { id: 'online', title: 'online' },
        { id: 'timestamp', title: 'timestamp' }
      ]
    })
    await csv_writer.writeRecords(rows)

    // const gz_filename = `${filename}.tar.gz`
    // await zip({ gz_filename, csv_filename })
    await upload(csv_filename)

    const timestamps = rows.map((r) => r.timestamp)
    const uniq_timestamps = [...new Set(timestamps)]
    const count = await db('representatives_uptime')
      .whereIn('timestamp', uniq_timestamps)
      .del()
    logger(`removed ${count} rows from representatives_uptime`)

    offset += batch_size
  } while (rows.length === batch_size)
}

const archive_representatives_telemetry = async ({ batch_size = 10000 }) => {
  logger('archiving representatives_telemetry')
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 6 * 7 * 24 // 6 weeks
  let offset = 0
  let rows = []
  do {
    const resp = await db.raw(
      `select * from representatives_telemetry where timestamp < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR) limit ${batch_size} offset ${offset}`
    )
    rows = resp[0]
    if (!rows.length) {
      logger('no rows to archive')
      return
    }

    await storage_mysql('representatives_telemetry')
      .insert(rows)
      .onConflict()
      .merge()
    logger(`copied ${rows.length} rows to storage_mysql`)

    logger(`archving ${rows.length} representatives_telemetry entries`)
    const filename = `representatives-telemetry-archive_${timestamp}`
    const csv_filename = `${filename}.csv`
    const csv_writer = createCsvWriter({
      path: `${dir}/${csv_filename}`,
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
    await csv_writer.writeRecords(rows)

    // const gz_filename = `${filename}.tar.gz`
    // await zip({ gz_filename, csv_filename })
    await upload(csv_filename)

    const timestamps = rows.map((r) => r.timestamp)
    const uniq_timestamps = [...new Set(timestamps)]
    const count = await db('representatives_telemetry')
      .whereIn('timestamp', uniq_timestamps)
      .del()
    logger(`removed ${count} rows from representatives_telemetry`)

    offset += batch_size
  } while (rows.length === batch_size)
}

const archive_posts = async ({ batch_size = 10000 }) => {
  logger('archiving posts')
  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const hours = 6 * 7 * 24 // 6 weeks
  let offset = 0
  let posts = []
  do {
    posts = await db('posts')
      .select('posts.*')
      .leftJoin('post_labels', 'posts.id', 'post_labels.post_id')
      .whereNull('post_labels.label')
      .whereRaw(
        `created_at < UNIX_TIMESTAMP(NOW() - INTERVAL ${hours} HOUR) limit ${batch_size} offset ${offset}`
      )

    if (!posts.length) {
      logger('no posts to archive')
      return
    }

    await storage_mysql('posts').insert(posts).onConflict().merge()
    logger(`copied ${posts.length} rows to storage_mysql`)

    logger(`archving ${posts.length} posts`)
    const filename = `posts-archive_${timestamp}`
    const csv_filename = `${filename}.csv`
    const csv_writer = createCsvWriter({
      path: `${dir}/${csv_filename}`,
      header: [
        { id: 'id', title: 'id' },
        { id: 'pid', title: 'pid' },
        { id: 'sid', title: 'sid' },
        { id: 'title', title: 'title' },
        { id: 'url', title: 'url' },
        { id: 'content_url', title: 'content_url' },
        { id: 'author', title: 'author' },
        { id: 'authorid', title: 'authorid' },
        { id: 'text', title: 'text' },
        { id: 'html', title: 'html' },
        { id: 'summary', title: 'summary' },
        { id: 'score', title: 'score' },
        { id: 'social_score', title: 'social_score' },
        { id: 'created_at', title: 'created_at' },
        { id: 'updated_at', title: 'updated_at' }
      ]
    })
    await csv_writer.writeRecords(posts)

    // const gz_filename = `${filename}.tar.gz`
    // await zip({ gz_filename, csv_filename })
    await upload(csv_filename)

    const post_ids = posts.map((r) => r.id)
    const uniq_post_ids = [...new Set(post_ids)]
    const count = await db('posts').whereIn('id', uniq_post_ids).del()
    logger(`removed ${count} rows from posts`)

    offset += batch_size
  } while (posts.length === batch_size)
}

const archive_mysql = async ({ batch_size = 10000 }) => {
  try {
    await archive_representatives_uptime({ batch_size })
  } catch (err) {
    console.log(err)
  }

  try {
    await archive_representatives_telemetry({ batch_size })
  } catch (err) {
    console.log(err)
  }

  try {
    await archive_posts({ batch_size })
  } catch (err) {
    console.log(err)
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      const batch_size = argv.batch_size || 10000
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
