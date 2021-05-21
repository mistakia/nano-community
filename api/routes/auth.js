const express = require('express')
const nano = require('nanocurrency')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['pub', 'address', 'signature']
    for (const req of required) {
      if (!req.body[req]) {
        return res.status(400).send({ error: `missing ${req} param` })
      }
    }

    const { pub, address, signature } = req.body


    if (!nano.checkKey(pub)) {
      return res.status(401).send({ error: 'invalid pub param' })
    }

    if (!nano.checkAddress(address)) {
      return res.status(401).send({ error: 'invalid address param' })
    }

    /* const decodedKey = nacl.util.decodeBase64(pub)
     * const decodedSignature = nacl.util.decodeBase64(signature)
     * const signedMessage = nacl.sign.open(decodedSignature, decodedKey)
     * if (signedMessage !== address) {
     *   return res.status(401).send({ error: 'invalid signature or address param' })
     * }
     */

    return res.send({ success: true })
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

module.exports = router
