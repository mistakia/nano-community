import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { request, wait, formatRedditPost, isMain } from '#common'
import db from '#db'

const argv = yargs(hideBin(process.argv)).argv
const logger = debug('import-subreddit')
debug.enable('import-subreddit')

const importSubreddit = async (subreddit, { getFullHistory = false } = {}) => {
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
      logger('no response received')
      break
    }

    logger(`found ${res.data.children.length} posts`)

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

if (isMain(import.meta.url)) {
  if (!argv.r) {
    logger('missing r')
    process.exit()
  }

  const getFullHistory = argv.full
  const main = async () => {
    try {
      await importSubreddit(argv.r, { getFullHistory })
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

export default importSubreddit
