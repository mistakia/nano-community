import express from 'express'
import cron from 'node-cron'

import db from '#db'
import { groupBy } from '#common'
import cache from '#api/cache.mjs'

const router = express.Router()

// Shared SQL fragment for the deduplication key: collapses to content_url
// when set, falling back to url. Used as the DISTINCT ON target and as the
// matching leading-ORDER-BY column. Inlined (not a CTE/computed column) so
// the expressions in DISTINCT ON and ORDER BY are literally identical, as
// PG requires.
const MAIN_URL_EXPR =
  "(CASE WHEN posts.content_url = '' THEN posts.url ELSE posts.content_url END)"

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

    const inner = db('sources')
    inner.select(db.raw(
      `DISTINCT ON (${MAIN_URL_EXPR}) posts.*, sources.score_avg, ` +
      `${MAIN_URL_EXPR} AS main_url, ` +
      'sources.title AS source_title, sources.logo_url AS source_logo_url, ' +
      '(posts.score / sources.score_avg) AS strength'
    ))
    inner.join('posts', 'posts.sid', 'sources.id')
    inner.leftJoin('post_labels', 'posts.id', 'post_labels.post_id')
    inner.whereNotNull('posts.text')
    inner.whereIn('post_labels.label', label)
    inner.whereNot('posts.text', '')
    inner.whereNot('posts.pid', 'like', 'discord:844618231553720330:%') // network status
    inner.whereNot('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
    inner.whereNot('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
    inner.whereNot('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
    inner.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
    inner.whereNot('posts.sid', 'discord:431804330853662721') // Nano rep-support
    // DISTINCT ON requires the leading ORDER BY column to match the
    // DISTINCT ON expression literally; the second sort selects the
    // winning row per main_url group (highest strength).
    inner.orderByRaw(`${MAIN_URL_EXPR}, (posts.score / sources.score_avg) DESC`)

    const posts = await db
      .from(inner.as('t'))
      .select('*')
      .orderBy('strength', 'desc')
      .offset(offset)
      .limit(limit)
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

const load_trending_posts = async ({
  limit = 100,
  age = 72,
  decay = 90000
} = {}) => {
  // MySQL semantic (lax GROUP BY + MAX aggregate over alias-equal expr):
  // for each unique main_url, keep one row with the maximum per-row strength
  // value. PG equivalent: DISTINCT ON (main_url) with ORDER BY strength DESC.
  // The MAX wrapper is dropped because per-row strength is constant within a
  // single posts row; the dedup is what picks the winning row per group.
  const strength_expr =
    '(LOG10(posts.score / sources.score_avg) - ' +
    '((EXTRACT(EPOCH FROM NOW())::INTEGER - posts.created_at) / ?))'
  const inner = db('sources')
  inner.select(db.raw(
    `DISTINCT ON (${MAIN_URL_EXPR}) posts.*, sources.score_avg, ` +
    `${MAIN_URL_EXPR} AS main_url, ` +
    'sources.title AS source_title, sources.logo_url AS source_logo_url, ' +
    `${strength_expr} AS strength`,
    [decay]
  ))
  inner.join('posts', 'posts.sid', 'sources.id')
  inner.whereRaw('posts.created_at > (EXTRACT(EPOCH FROM NOW())::INTEGER - ?)', age * 60 * 60)
  inner.whereNotNull('posts.text')
  inner.whereNot('posts.text', '')
  inner.where('posts.score', '>', 4)
  inner.whereNot('posts.pid', 'like', 'discord:370266023905198085:%') // Nano #general
  inner.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
  inner.whereNot('posts.pid', 'like', 'discord:431804330853662721:%') // Nano #rep-support
  inner.orderByRaw(`${MAIN_URL_EXPR}, ${strength_expr} DESC`, [decay])

  const posts = await db
    .from(inner.as('t'))
    .select('*')
    .orderBy('strength', 'desc')
    .limit(limit)
  const postIds = posts.map((p) => p.id)
  const labels = await db('post_labels').whereIn('post_id', postIds)
  const labelsByPostId = groupBy(labels, 'post_id')
  for (const post of posts) {
    const postLabels = labelsByPostId[post.id] || []
    post.labels = postLabels
  }

  cache.set('trending', posts)
}

// trending posts over a span of time (with decay), freshness is given a value
router.get('/trending', async (req, res) => {
  const { logger, cache } = req.app.locals
  try {
    const cachePosts = cache.get('trending')
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const posts = await load_trending_posts()

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

    const inner = db('sources')
    inner.select(db.raw(
      `DISTINCT ON (${MAIN_URL_EXPR}) posts.*, sources.score_avg, ` +
      `${MAIN_URL_EXPR} AS main_url, ` +
      'sources.title AS source_title, sources.logo_url AS source_logo_url'
    ))
    inner.join('posts', 'posts.sid', 'sources.id')
    inner.where(function () {
      this.where('posts.pid', 'like', 'discord:844618231553720330:%') // network status
      this.orWhere('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
      this.orWhere('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
      this.orWhere('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
    })
    inner.whereRaw('posts.created_at > (EXTRACT(EPOCH FROM NOW())::INTEGER - ?)', age * 60 * 60)
    // DISTINCT ON winner per main_url: newest post (created_at DESC).
    inner.orderByRaw(`${MAIN_URL_EXPR}, posts.created_at DESC`)

    const posts = await db
      .from(inner.as('t'))
      .select('*')
      .orderBy('created_at', 'desc')
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

const load_top_posts = async ({ offset = 0, age = 168, limit = 5 } = {}) => {
  const inner = db('sources')
  inner.select(db.raw(
    `DISTINCT ON (${MAIN_URL_EXPR}) posts.*, sources.score_avg, ` +
    `${MAIN_URL_EXPR} AS main_url, ` +
    'sources.title AS source_title, sources.logo_url AS source_logo_url, ' +
    '(posts.score / sources.score_avg) AS strength'
  ))
  inner.join('posts', 'posts.sid', 'sources.id')
  inner.whereRaw('posts.created_at > (EXTRACT(EPOCH FROM NOW())::INTEGER - ?)', age * 60 * 60)
  inner.whereNotNull('posts.text')
  inner.whereNot('posts.text', '')
  inner.whereNot('posts.pid', 'like', 'discord:844618231553720330:%') // network status
  inner.whereNot('posts.pid', 'like', 'discord:370285586894028811:%') // announcements
  inner.whereNot('posts.pid', 'like', 'discord:572793415138410517:%') // beta-announcements
  inner.whereNot('posts.pid', 'like', 'discord:644987172935565335:%') // rep-announcements
  inner.whereNot('posts.sid', 'discord:403628195548495882') // NanoTrade Server
  inner.whereNot('posts.pid', 'like', 'discord:431804330853662721:%') // Nano #rep-support
  inner.orderByRaw(`${MAIN_URL_EXPR}, (posts.score / sources.score_avg) DESC`)

  const posts = await db
    .from(inner.as('t'))
    .select('*')
    .orderBy('strength', 'desc')
    .offset(offset)
    .limit(limit)
  const postIds = posts.map((p) => p.id)
  const labels = await db('post_labels').whereIn('post_id', postIds)
  const labelsByPostId = groupBy(labels, 'post_id')
  for (const post of posts) {
    const postLabels = labelsByPostId[post.id] || []
    post.labels = postLabels
  }

  cache.set(`top_${age}`, posts)
  return posts
}

// top posts over a span of time (no decay)
router.get('/top', async (req, res) => {
  const { logger, cache } = req.app.locals
  try {
    // maximum age of a post (in hours)
    const max_hours = 720
    const age = Math.min(Number(req.query.age) || 168, max_hours)

    const cachePosts = cache.get(`top_${age}`)
    if (cachePosts) {
      return res.status(200).send(cachePosts)
    }

    const posts = await load_top_posts({ age })

    res.status(200).send(posts)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/7 * * * *', async () => {
    const ages = [72, 168, 720]
    for (const age of ages) {
      await load_top_posts({ age })
    }
    await load_trending_posts()
  })
}

export default router
