const express = require('express')
const router = express.Router()

const { request } = require('../../common')
const { nanodbAPI } = require('../../config')

router.get('/?', async (req, res) => {
  const { logger } = req.app.locals
  try {
    const data = await request({ url: `${nanodbAPI}/status` })
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
