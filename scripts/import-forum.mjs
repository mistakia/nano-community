import dayjs from 'dayjs'
import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { request, wait, isMain } from '#common'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const logger = debug('import-forum')
debug.enable('import-forum')

const importForum = async ({ getFullHistory = false } = {}) => {
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

    messageIds = res.latest_posts.map((p) => p.id)
    beforeId = messageIds[messageIds.length - 1]
    if (!getFullHistory && messageIds.includes(messageId)) {
      break
    }

    await wait(2000)
  } while (res && res.latest_posts.length && beforeId)
}

if (isMain(import.meta.url)) {
  const getFullHistory = argv.full
  const main = async () => {
    try {
      await importForum({ getFullHistory })
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
