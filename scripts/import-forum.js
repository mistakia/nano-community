const moment = require('moment')
const debug = require('debug')

const { request, wait } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const main = async ({ getFullHistory = false } = {}) => {
  logger(`importing posts from forum (full history: ${getFullHistory})`)

  const rows = await db('posts')
    .where('pid', 'like', 'forum:%')
    .orderBy('created_at', 'desc')
    .limit(1)

  const messageId = rows.length ? rows[0].pid.split(/forum:/)[1] : undefined

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
      title: p.topic_title,
      url: `https://forum.nano.org/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`,
      author: p.username,
      authroid: p.username,
      created_at: moment(p.created_at).unix(),
      updated_at: moment(p.updated_at).unix(),
      html: p.cooked,
      text: p.raw,
      score: p.score
    }))

    console.log(posts)

    if (posts.length) {
      logger(`saving ${posts.length} posts from forum`)
      // await db('posts').insert(posts).onConflict().merge()
    }

    messageIds = res.latest_posts.map((p) => p.id)
    beforeId = messageIds[messageIds.length - 1]
    if (!getFullHistory && messageIds.includes(messageId)) {
      break
    }

    await wait(2000)
  } while (res && res.latest_posts.length && beforeId)
}

module.exports = main

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  const getFullHistory = argv.full
  const init = async () => {
    await main({ getFullHistory })
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
