const express = require('express')
const moment = require('moment')
const router = express.Router()

const median = (arr) => {
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

const summary = (arr) => {
  let max = 0
  let min = Infinity
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    max = Math.max(item, max)
    min = Math.min(item, min)
  }

  return {
    min,
    max,
    median: median(arr)
  }
}

router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cachedWeight = cache.get('weight')
    if (cachedWeight) {
      return res.status(200).send(cachedWeight)
    }

    const weights = await db('voting_weight')
      .where('timestamp', '>', moment().subtract(15, 'minutes').unix())
      .orderBy('timestamp', 'asc')

    const onlineWeight = []
    const trendedWeight = []

    for (let i = 0; i < weights.length; i++) {
      const item = weights[i]
      onlineWeight.push(item.online_stake_total)
      trendedWeight.push(item.trended_stake_total)
    }

    const weight = {
      onlineWeight: summary(onlineWeight),
      trendedWeight: summary(trendedWeight)
    }

    cache.set('weight', weight, 60)
    res.status(200).send(weight)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
