import express from 'express'

import { rpc } from '#common'
import { rpcAddresses } from '#config'

const router = express.Router()

router.get('/telemetry', async (req, res) => {
  const { logger, cache } = req.app.locals
  try {
    const cachedTelemetry = cache.get('telemetry')
    if (cachedTelemetry) {
      return res.status(200).send(cachedTelemetry)
    }

    const url = rpcAddresses[0]
    const rpcResponse = await rpc.telemetry({ url })

    if (!rpcResponse) {
      res.status(500).send({ error: 'no response from node' })
      return
    }

    if (rpcResponse.error) {
      res.status(500).send({ error: rpcResponse.error })
      return
    }

    cache.set('telemetry', rpcResponse, 60)
    res.status(200).send(rpcResponse)
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
