import express from 'express'

import { request } from '#common'
import { nanodbAPI } from '#config'

const router = express.Router()

router.get(/^(.*)$/, async (req, res) => {
  const { logger } = req.app.locals
  try {
    const path = req.params[0]
    const url = `${nanodbAPI}${path}`
    const data = await request({ url })
    res.status(200).send(data)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
