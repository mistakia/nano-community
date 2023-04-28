import dayjs from 'dayjs'
import debug from 'debug'
import yargs from 'yargs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'
import { hideBin } from 'yargs/helpers'

import { request, wait, isMain, convertToCSV } from '#common'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const logger = debug('import-forum')
debug.enable('import-forum')

const importForum = async ({
  getFullHistory = false,
  save_to_file = false
} = {}) => {
  logger(`importing posts from forum (full history: ${getFullHistory})`)

  const rows = await db('posts')
    .where('pid', 'like', 'forum:%')
    .orderBy('created_at', 'desc')
    .limit(1)

  const re = /forum:topic:[0-9]+:post:(?<postId>[0-9]+)/
  const messageId = rows.length
    ? parseInt(rows[0].pid.match(re).groups.postId, 10)
    : undefined

  logger(`last fetched messageId: ${messageId}`)

  let items = []

  let beforeId, messageIds, res

  do {
    const url =
      'https://forum.nano.org/posts.json?limit=50' +
      (beforeId ? `&before=${beforeId}` : '')

    logger(`fetching content from forum, after: ${beforeId || 'n/a'}`)

    try {
      res = await request({ url })
    } catch (err) {
      // console.log(err)
    }

    if (!res) {
      break
    }

    const posts = res.latest_posts.map((p) => ({
      pid: `forum:topic:${p.topic_id}:post:${p.id}`,
      sid: 'forum',
      title: p.topic_title,
      url: `https://forum.nano.org/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`,
      author: p.username,
      authorid: p.username,
      created_at: dayjs(p.created_at).unix(),
      updated_at: dayjs(p.updated_at).unix(),
      html: p.cooked,
      text: p.raw,
      score: p.score
    }))

    if (posts.length) {
      logger(`saving ${posts.length} posts from forum`)
      await db('posts').insert(posts).onConflict().merge()
    }

    items = items.concat(res.latest_posts)

    messageIds = res.latest_posts.map((p) => p.id)
    if (!getFullHistory && messageIds.includes(messageId)) {
      break
    }

    const lastId = messageIds[messageIds.length - 1]
    if (lastId === beforeId) {
      break
    }

    beforeId = messageIds[messageIds.length - 1]

    await wait(2000)
  } while (res && res.latest_posts.length && beforeId)

  if (getFullHistory && save_to_file) {
    const header = {}
    for (const field of Object.keys(items[0])) {
      header[field] = field
    }
    const csv_data = [header, ...items]
    const csv_data_string = JSON.stringify(csv_data)
    const csv = convertToCSV(csv_data_string)

    const __dirname = dirname(fileURLToPath(import.meta.url))
    const data_path = path.join(__dirname, '../data')

    const json_file_path = `${data_path}/forum_posts.json`
    const csv_file_path = `${data_path}/forum_posts.csv`

    await fs.writeJson(json_file_path, items, { spaces: 2 })
    logger(`wrote json to ${json_file_path}`)

    await fs.writeFile(csv_file_path, csv)
    logger(`wrote csv to ${csv_file_path}`)
  }
}

if (isMain(import.meta.url)) {
  const getFullHistory = argv.full
  const main = async () => {
    try {
      await importForum({ getFullHistory, save_to_file: argv.save })
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

export default importForum
