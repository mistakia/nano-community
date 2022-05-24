const express = require('express')
const router = express.Router()

const { groupBy } = require('../../common')

router.get('/labels', async (req, res) => {
  const { db, logger, cache } = req.app.locals
  try {
    const offset = parseInt(req.query.offset || 0, 10)
    const limit = Math.min(parseInt(req.query.limit || 50, 10), 100)
    let { label } = req.query

    if (!label) {
      return res.status(401).send({ error: 'missing label param' })
    }

    if (!Array.isArray(label)) {
      label = [label]
    }

    label = label.sort((a, b) => a - b)

    const cacheId = `labels_${label.join('-')}`
    const cachePosts = cache.get(cacheId)
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const query = db('sources').offset(offset)
    query.select('posts.*', 'sources.score_avg')
    query.select(
      db.raw(
        '(CASE WHEN `posts`.`content_url` = "" THEN `posts`.`url` ELSE `posts`.`content_url` END) as main_url'
      )
    )
    query.select(db.raw('sources.title as source_title'))
    query.select(db.raw('sources.logo_url as source_logo_url'))
    query.select(db.raw('(posts.score / sources.score_avg) as strength'))
    query.join('posts', 'posts.sid', 'sources.id')
    query.leftJoin('post_labels', 'posts.id', 'post_labels.post_id')
    query.whereNotNull('posts.text')

    query.whereIn('post_labels.label', label)

    query.whereNot('posts.text', '')
    query.whereNot('posts.pid', 'like', 'discord:844618231553720330:%') // network status
    query.whereNot('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
    query.whereNot('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
    query.whereNot('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
    query.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
    query.whereNot('posts.sid', 'discord:431804330853662721') // Nano rep-support

    query.orderBy('strength', 'desc')
    query.groupBy('main_url')

    query.limit(limit)

    const posts = await query
    const postIds = posts.map((p) => p.id)
    const labels = await db('post_labels').whereIn('post_id', postIds)
    const labelsByPostId = groupBy(labels, 'post_id')
    for (const post of posts) {
      const postLabels = labelsByPostId[post.id] || []
      post.labels = postLabels
    }

    cache.set(cacheId, posts)
    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

// trending posts over a span of time (with decay), freshness is given a value
router.get('/trending', async (req, res) => {
  const { db, logger, cache } = req.app.locals
  try {
    const limit = 100 // Math.min(parseInt(req.query.limit || 100, 10), 100)
    // const excludedIds = (req.query.excludedIds || '').split(',')

    // maximum age of a post (in hours)
    const age = 72 // Math.min(parseInt(req.query.age || 72, 10), 168)

    // rate at which a post score decays
    const decay = 90000 // parseInt(req.query.decay || 90000, 10)

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
    query.whereNotNull('posts.text')
    query.whereNot('posts.text', '')
    query.where('posts.score', '>', 4)
    query.whereNot('posts.pid', 'like', 'discord:370266023905198085:%') // exclude posts from general channel
    query.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
    query.whereNot('posts.sid', 'discord:431804330853662721') // Nano rep-support

    // if (excludedIds.length) query.whereNotIn('posts.id', excludedIds)
    query.groupBy('main_url')

    query.limit(limit)

    const posts = await query
    const postIds = posts.map((p) => p.id)
    const labels = await db('post_labels').whereIn('post_id', postIds)
    const labelsByPostId = groupBy(labels, 'post_id')
    for (const post of posts) {
      const postLabels = labelsByPostId[post.id] || []
      post.labels = postLabels
    }

    cache.set('trending', posts)
    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

router.get('/announcements', async (req, res) => {
  const { db, logger, cache } = req.app.locals
  try {
    // maximum age of a post (in hours)
    const age = parseInt(req.query.age || 336, 10)

    const cacheId = `announcements${age}`
    const cachePosts = cache.get(cacheId)
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
    query.join('posts', 'posts.sid', 'sources.id')

    query.where(function () {
      this.where('posts.pid', 'like', 'discord:844618231553720330:%') // network status
      this.orWhere('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
      // this.orWhere('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
      this.orWhere('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
    })
    query.whereRaw('posts.created_at > (UNIX_TIMESTAMP() - ?)', age * 60 * 60)
    query.orderBy('posts.created_at', 'desc')
    query.groupBy('main_url')

    const posts = await query
    const postIds = posts.map((p) => p.id)
    const labels = await db('post_labels').whereIn('post_id', postIds)
    const labelsByPostId = groupBy(labels, 'post_id')
    for (const post of posts) {
      const postLabels = labelsByPostId[post.id] || []
      post.labels = postLabels
    }

    cache.set(cacheId, posts)
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
    const offset = 0 // parseInt(req.query.offset || 0, 10)
    const limit = 5 // parseInt(req.query.limit || 5, 10)

    // maximum age of a post (in hours)
    const age = parseInt(req.query.age || 168, 10)

    const cacheId = `top${age}`
    const cachePosts = cache.get(cacheId)
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const query = db('sources').offset(offset)
    query.select('posts.*', 'sources.score_avg')
    query.select(
      db.raw(
        '(CASE WHEN `posts`.`content_url` = "" THEN `posts`.`url` ELSE `posts`.`content_url` END) as main_url'
      )
    )
    query.select(db.raw('sources.title as source_title'))
    query.select(db.raw('sources.logo_url as source_logo_url'))
    query.select(db.raw('(posts.score / sources.score_avg) as strength'))
    query.join('posts', 'posts.sid', 'sources.id')
    query.whereRaw('posts.created_at > (UNIX_TIMESTAMP() - ?)', age * 60 * 60)
    query.whereNotNull('posts.text')

    query.whereNot('posts.text', '')
    query.whereNot('posts.pid', 'like', 'discord:844618231553720330:%') // network status
    query.whereNot('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
    query.whereNot('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
    query.whereNot('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
    query.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
    query.whereNot('posts.sid', 'discord:431804330853662721') // Nano rep-support

    query.orderBy('strength', 'desc')
    query.groupBy('main_url')

    query.limit(limit)

    const posts = await query
    const postIds = posts.map((p) => p.id)
    const labels = await db('post_labels').whereIn('post_id', postIds)
    const labelsByPostId = groupBy(labels, 'post_id')
    for (const post of posts) {
      const postLabels = labelsByPostId[post.id] || []
      post.labels = postLabels
    }

    cache.set(cacheId, posts)
    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
