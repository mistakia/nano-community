import express from 'express'
import cron from 'node-cron'

import { request } from '#common'
import cache from '#api/cache.mjs'
import config from '#config'

const { nanodbAPI } = config
const router = express.Router()

const load_network = async () => {
  const [nanodb_response, coingecko_response] = await Promise.allSettled([
    request({ url: `${nanodbAPI}/stats` }),
    request({
      url: 'https://api.coingecko.com/api/v3/coins/nano?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
    })
  ])

  if (
    nanodb_response.status === 'rejected' &&
    coingecko_response.status === 'rejected'
  ) {
    throw new Error('requests failed')
  }

  const response_data = {
    nanodb: nanodb_response.value,
    current_price_usd: coingecko_response.value?.market_data?.current_price?.usd
  }

  cache.set('stats', response_data, 300)
  return response_data
}

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', async () => {
    await load_network()
  })
}

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
