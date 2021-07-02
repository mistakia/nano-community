const express = require('express')

const router = express.Router({ mergeParams: true })

router.use('/?', async (req, res) => {
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

    const cachedRep = cache.get(address)
    if (cachedRep) {
      return res.status(200).send(cachedRep)
    }

    const representatives = await db('accounts').where({
      account: address,
      representative: true
    })

    if (!representatives.length) {
      return res.status(200).send({
        account: address,
        representative: false,
        account_meta: {},
        representative_meta: {},
        uptime: [],
        telemetry: {},
        telemetry_history: [],
        network: {}
      })
    }

    const uptime = await db('representatives_uptime_rollup_2hour')
      .where({ account: address })
      .orderBy('interval', 'asc')

    const accountMeta = await db('accounts_meta')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const repMeta = await db('representatives_meta')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const network = await db('representatives_network')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const telemetry = await db('representatives_telemetry')
      .where({ account: address })
      .orderBy('timestamp', 'desc')
      .limit(1000)

    const rep = representatives[0]
    rep.account_meta = accountMeta[0] || {}
    rep.representative_meta = repMeta[0] || {}
    rep.uptime = uptime
    rep.telemetry = telemetry[0] || {}
    rep.telemetry_history = telemetry
    rep.network = network[0] || {}

    cache.set(address, rep, 120)
    res.send(rep)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
