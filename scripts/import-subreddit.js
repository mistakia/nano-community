const debug = require('debug')

const { request, wait, formatRedditPost } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const main = async (subreddit, { getFullHistory = false } = {}) => {
  logger(
    `importing reddit posts from: ${subreddit} (full history: ${getFullHistory})`
  )

  const rows = await db('posts')
    .where('pid', 'like', `reddit:${subreddit}%`)
    .orderBy('created_at', 'desc')
    .limit(1)

  const re = new RegExp(`reddit:${subreddit}:post:`)
  const messageId = rows.length ? rows[0].pid.split(re)[1] : undefined

  logger(`last saved message: ${messageId}`)

  let afterId, messageIds, res

  do {
    const url =
      `https://www.reddit.com/r/${subreddit}.json?limit=100` +
      (afterId ? `&after=${afterId}` : '')

    logger(`fetching content from ${subreddit}, after: ${afterId || 'n/a'}`)
    try {
      res = await request({ url })
    } catch (err) {
      // console.log(err)
    }

    if (!res) {
      break
    }

    const inserts = []

    for (const post of res.data.children) {
      const content = formatRedditPost(post)
      if (content) {
        inserts.push(content)
      }
    }

    if (inserts.length) {
      logger(`saving ${inserts.length} posts from ${subreddit}`)
      await db('posts').insert(inserts).onConflict().merge()
    }

    messageIds = res.data.children.map((p) => p.data.id)
    afterId = res.data.after
    if (!getFullHistory && messageIds.includes(messageId)) {
      break
    }

    await wait(2000)
  } while (res && res.data.children.length && afterId)
}

module.exports = main

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  if (!argv.r) {
    logger('missing r')
    process.exit()
  }

  const getFullHistory = argv.full
  const init = async () => {
    await main(argv.r, { getFullHistory })
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
