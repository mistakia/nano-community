const express = require('express')

const { request } = require('../../../common')
const { nanodbAPI } = require('../../../config')

const router = express.Router({ mergeParams: true })

router.get('/:type/summary', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const { address, type } = req.params

    if (!address) {
      return res.status(401).send({ error: 'missing address' })
    }

    const re = /^(nano|xrb)_[13]{1}[13456789abcdefghijkmnopqrstuwxyz]{59}$/gi
    if (!re.test(address)) {
      return res.status(401).send({ error: 'invalid address' })
    }

    if (!type) {
      return res.status(401).send({ error: 'missing type' })
    }

    const types = ['send', 'receive', 'change']
    if (!types.includes(type)) {
      return res.status(401).send({ error: 'invalid type' })
    }

    const limit = Math.min(parseInt(req.query.limit || 100, 0), 100)
    const offset = parseInt(req.query.offset, 0) || 0

    const url = `${nanodbAPI}/accounts/${address}/transactions/${type}?limit=${limit}&offset=${offset}`
    const data = await request({ url })
    const addresses = data.map((d) => d.destination_account)
    const rows = await db('accounts')
      .select('account', 'alias')
      .whereIn('account', addresses)

    for (let i = 0; i < data.length; i++) {
      const item = rows.find((r) => r.account === data[i].destination_account)
      data[i].destination_alias = item ? item.alias : null
    }
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
