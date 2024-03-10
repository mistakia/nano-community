import express from 'express'
import cron from 'node-cron'

import { request } from '#common'
import cache from '#api/cache.mjs'
import { nanodbAPI } from '#config'

const router = express.Router()

const load_network = async () => {
  const nanodb_stats_request = request({ url: `${nanodbAPI}/stats` })
  // TODO remove dependency
  const nanobrowse_stats_request = request({
    url: 'https://stats.nanobrowse.com/json/stats.json'
  })
  // TODO remove dependency
  const nanobrowse_monitors_request = request({
    url: 'https://stats.nanobrowse.com/json/monitors.json'
  })
  const coingecko_request = request({
    url: 'https://api.coingecko.com/api/v3/coins/nano?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=true'
  })

  const [
    nanodb_response,
    nanobrowse_stats_response,
    nanobrowse_monitors_response,
    coingecko_response
  ] = await Promise.allSettled([
    nanodb_stats_request,
    nanobrowse_stats_request,
    nanobrowse_monitors_request,
    coingecko_request
  ])
  const fulfilled_responses = [
    nanodb_response,
    nanobrowse_stats_response,
    nanobrowse_monitors_response,
    coingecko_response
  ].filter(({ status }) => status === 'fulfilled')
  if (!fulfilled_responses.length) {
    throw new Error('requests failed')
  }

  const response_data = {
    nanodb: nanodb_response.value,
    nanobrowse: nanobrowse_stats_response.value,
    nanobrowse_monitors: nanobrowse_monitors_response.value,
    current_price_usd: coingecko_response.value.market_data.current_price.usd,

    ...nanodb_response.value, // TODO remove
    ...nanobrowse_stats_response.value, // TODO remove
    peers: nanobrowse_monitors_response.value // TODO remove
  }

  cache.set('stats', response_data, 300)
  return response_data
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
