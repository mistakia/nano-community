import express from 'express'
import nano from 'nanocurrency'
import { tools } from 'nanocurrency-web'

import { USERNAME_RE } from '#constants'

const router = express.Router()

router.post('/register', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['pub', 'address', 'signature', 'username']
    for (const prop of required) {
      if (!req.body[prop]) {
        return res.status(400).send({ error: `missing ${prop} param` })
      }
    }

    const { pub, signature, username } = req.body
    let { address } = req.body

    if (!nano.checkKey(pub)) {
      return res.status(401).send({ error: 'invalid pub param' })
    }

    if (!nano.checkAddress(address)) {
      return res.status(401).send({ error: 'invalid address param' })
    }

    if (!USERNAME_RE.test(username)) {
      return res.status(401).send({ error: 'invalid username param' })
    }

    const publicKey = tools.addressToPublicKey(address)
    const validSignature = tools.verify(publicKey, signature, pub)
    if (!validSignature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const usernameExists = await db('users')
      .where({ username })
      .whereNot({ pub })
    if (usernameExists.length) {
      return res.status(401).send({ error: 'username exists' })
    }

    // TODO verify address exists on ledger

    address = address.replace('xrb_', 'nano_')

    const exists = await db('user_addresses').where({ address })
    let accountId = exists.length ? exists[0].account_id : null

    if (!accountId) {
      const result = await db('users')
        .insert({
          pub,
          username,
          last_visit: Math.round(Date.now() / 1000)
        })
        .onConflict()
        .merge()
      accountId = result[0]
    } else {
      await db('users')
        .update({ last_visit: Math.round(Date.now() / 1000), username })
        .where({ id: accountId })
    }

    await db('user_addresses')
      .insert({
        account_id: accountId,
        address,
        signature
      })
      .onConflict()
      .merge()

    return res.send({
      accountId,
      address,
      username,
      signature
    })
  } catch (error) {
    logger(error)
    res.status(500).send({ error: error.toString() })
  }
})

export default router
