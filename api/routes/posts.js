const express = require('express')
const router = express.Router()

// trending posts over a span of time (with decay), freshness is given a value
router.get('/trending', async (req, res) => {
  const { db, logger, cache } = req.app.locals
  try {
    const limit = Math.min(parseInt(req.query.limit || 100, 10), 100)
    const excludedIds = (req.query.excludedIds || '').split(',')

    // maximum age of a post (in hours)
    const age = Math.min(parseInt(req.query.age || 72, 10), 168)

    // rate at which a post score decays
    const decay = parseInt(req.query.decay || 90000, 10)

    const cachePosts = cache.get('trending')
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const query = db('sources')
    query.select('posts.*', 'sources.score_avg')
    query.select(
      db.raw(
        '(CASE WHEN `posts`.`content_url` = "" THEN `posts`.`url` ELSE `posts`.`content_url` END) as main_url'
      )
    )
    query.select(db.raw('sources.title as source_title'))
    query.select(db.raw('sources.logo_url as source_logo_url'))
    query.select(
      db.raw(
        'MAX(LOG10(posts.score / sources.score_avg) - ((UNIX_TIMESTAMP() - posts.created_at) / ?)) as strength',
        [decay]
      )
    )
    query.join('posts', 'posts.sid', 'sources.id')
    query.orderBy('strength', 'desc')
    // query.whereIn('sources.id', sourceIds)
    query.whereRaw('posts.created_at > (UNIX_TIMESTAMP() - ?)', age * 60 * 60)
    if (excludedIds.length) query.whereNotIn('posts.id', excludedIds)
    query.groupBy('main_url')

    query.limit(limit)

    console.log(query.toString())

    const posts = await query
    cache.set('trending', posts)
    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

// top posts over a span of time (no decay)
router.get('/top', async (req, res) => {
  const { db, logger, cache } = req.app.locals
  try {
    const offset = parseInt(req.query.offset || 0, 10)
    const limit = parseInt(req.query.limit || 5, 10)

    // maximum age of a post (in hours)
    const age = parseInt(req.query.age || 168, 10)

    const cachePosts = cache.get('top')
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const query = db('sources').offset(offset)
    query.select('posts.*', 'sources.score_avg')
    query.select(db.raw('sources.title as source_title'))
    query.select(db.raw('sources.logo_url as source_logo_url'))
    query.select(db.raw('(posts.score / sources.score_avg) as strength'))
    query.join('posts', 'posts.sid', 'sources.id')
    query.whereRaw('posts.created_at > (UNIX_TIMESTAMP() - ?)', age * 60 * 60)
    query.orderBy('strength', 'desc')

    query.limit(limit)

    const posts = await query
    cache.set('top', posts)
    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
