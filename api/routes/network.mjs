import express from 'express'

import { request } from '#common'

const router = express.Router()

router.get('/', async (req, res) => {
  const { logger, cache } = req.app.locals
  try {
    const cachedStats = cache.get('stats')
    if (cachedStats) {
      return res.status(200).send(cachedStats)
    }

    const requests = [
      request({ url: 'https://json.nanoticker.info/?file=stats' }),
      request({ url: 'https://nanolooker.com/api/market-statistics' }),
      request({ url: 'https://json.nanoticker.info/?file=monitors' })
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
    cache.set('stats', stats, 60)
    res.status(200).send(stats)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
