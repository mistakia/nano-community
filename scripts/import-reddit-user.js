const debug = require('debug')

const {
  request,
  wait,
  formatRedditPost,
  formatRedditComment
} = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const subreddits = ['nanocurrency', 'nanotrade', 'raiblocks']

const format = (p) => {
  switch (p.kind) {
    case 't1':
      return formatRedditComment(p)
    case 't3':
      return formatRedditPost(p)
    default:
      logger(`Unsupported format: ${p.kind}`)
      return undefined
  }
}

const main = async (user, { getFullHistory = false, filter = true } = {}) => {
  logger(
    `importing reddit posts from: ${user} (full history: ${getFullHistory}, filter: ${filter})`
  )

  const rows = await db('posts')
    .where('pid', 'like', 'reddit:%')
    .where('authorid', user)
    .orderBy('created_at', 'desc')
    .limit(1)

  const messageId = rows.length
    ? rows[0].pid.split(/reddit:(?:post|comment):/)[1]
    : undefined

  let afterId, messageIds, res

  do {
    const url =
      `https://www.reddit.com/u/${user}.json?limit=100` +
      (afterId ? `&after=${afterId}` : '')

    logger(`fetching content from ${user}, after: ${afterId || 'n/a'}`)

    try {
      res = await request({ url })
    } catch (err) {
      // console.log(err)
    }

    if (!res) {
      break
    }

    let posts = res.data.children

    if (filter) {
      posts = posts.filter((p) => subreddits.includes(p.data.subreddit))
    }

    const inserts = []
    for (const post of posts) {
      const content = format(post)
      if (content) {
        inserts.push(content)
      }
    }

    if (inserts.length) {
      logger(`saving ${inserts.length} posts from ${user}`)
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

  if (!argv.user) {
    logger('missing user')
    process.exit()
  }

  const getFullHistory = argv.full
  const init = async () => {
    await main(argv.user, { getFullHistory, filter: !argv.noFilter })
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
