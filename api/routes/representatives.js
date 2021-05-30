const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {
  const { logger, cache, db } = req.app.locals
  try {
    const cachedReps = cache.get('representatives')
    if (cachedReps) {
      return res.status(200).send(cachedReps)
    }

    const representatives = await db('accounts').where({ representative: true })

    for (const rep of representatives) {
      const metas = await db('representatives_meta')
        .where({
          account: rep.account
        })
        .orderBy('timestamp', 'desc')
        .limit(1)

      rep.representative_meta = metas.length ? metas[0] : {}
    }

    cache.set('representatives', representatives, 60)
    res.status(200).send(representatives)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
