import express from 'express'
import cron from 'node-cron'

import { request } from '#common'
import cache from '#api/cache.mjs'

const router = express.Router()

const load_network = async () => {
  const requests = [
    request({ url: 'https://stats.nanobrowse.com/json/stats.json' }), // TODO remove dependency
    request({ url: 'https://nanolooker.com/api/market-statistics' }),
    request({ url: 'https://stats.nanobrowse.com/json/monitors.json' }) // TODO remove dependency
  ]

  const responses = await Promise.allSettled(requests)
  const fulfilled = responses.filter((r) => r.status === 'fulfilled')
  if (!fulfilled.length) {
    throw new Error('requests failed')
  }

  const stats = fulfilled.reduce((obj, v) => {
    if (Array.isArray(v.value)) {
      return { peers: v.value, ...obj }
    }

    // exclude priceStats
    const { priceStats, ...rest } = v.value
    return { ...rest, ...obj }
  }, {})
  cache.set('stats', stats, 300)
  return stats
}

cron.schedule('*/5 * * * *', async () => {
  await load_network()
})

router.get('/', async (req, res) => {
  const { logger, cache } = req.app.locals
  try {
    const cachedStats = cache.get('stats')
    if (cachedStats) {
      return res.status(200).send(cachedStats)
    }

    const stats = await load_network()

    res.status(200).send(stats)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
