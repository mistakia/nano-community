import express from 'express'

import { request } from '#common'
import config from '#config'

const { nanodbAPI } = config
const router = express.Router({ mergeParams: true })

router.get('/?', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const { address } = req.params

    if (!address) {
      return res.status(401).send({ error: 'missing address' })
    }

    const re = /^(nano|xrb)_[13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59}$/gi
    if (!re.test(address)) {
      return res.status(401).send({ error: 'invalid address' })
    }

    const cacheKey = `/account/${address}/open`
    const cachedValue = cache.get(cacheKey)
    if (cachedValue) {
      return res.status(200).send(cachedValue)
    }

    const url = `${nanodbAPI}/accounts/${address}/open`
    const data = await request({ url })
    const fundingAddress = data.funding_account
    if (!fundingAddress) {
      return res.send(data)
    }

    const rows = await db('accounts')
      .select('alias')
      .where('account', fundingAddress)
    data.funding_alias = rows.length ? rows[0].alias : null
    cache.set(cacheKey, data, 300)
    res.send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
