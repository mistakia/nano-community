import express from 'express'
import nano from 'nanocurrency'
import ed25519 from '@trashman/ed25519-blake2b'

const router = express.Router()
const USERNAME_RE = /^[A-Za-z][a-zA-Z0-9_]+$/

router.post('/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['public_key', 'signature', 'username']
    for (const prop of required) {
      if (!req.body[prop]) {
        return res.status(400).send({ error: `missing ${prop} param` })
      }
    }

    const { public_key, signature, username } = req.body

    if (!nano.checkKey(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (!USERNAME_RE.test(username)) {
      return res.status(401).send({ error: 'invalid username param' })
    }

    if (!nano.checkSignature(signature)) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const valid_signature = ed25519.verify(signature, public_key, public_key)
    if (!valid_signature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const usernameExists = await db('users')
      .where({ username })
      .whereNot({ public_key })
    if (usernameExists.length) {
      return res.status(401).send({ error: 'username exists' })
    }

    const result = await db('users')
      .insert({
        public_key,
        username,
        signature,
        last_visit: Math.round(Date.now() / 1000)
      })
      .onConflict()
      .merge()

    const user_id = result[0]

    return res.send({
      user_id,
      username
    })
  } catch (error) {
    console.log(error)
    logger(error)
    res.status(500).send('Internal server error')
  }
})

router.post('/key/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['public_key', 'signature', 'account']
    for (const prop of required) {
      if (!req.body[prop]) {
        return res.status(400).send({ error: `missing ${prop} param` })
      }
    }

    const { public_key, signature, account } = req.body

    if (!nano.checkKey(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (!nano.checkAddress(account)) {
      return res.status(401).send({ error: 'invalid account param' })
    }

    if (!nano.checkSignature(signature)) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const account_public_key = nano.derivePublicKey(account)
    const valid_signature = ed25519.verify(
      signature,
      public_key,
      account_public_key
    )
    if (!valid_signature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const created_at = Math.round(Date.now() / 1000)
    await db('account_keys')
      .insert({
        account,
        public_key,
        signature,
        created_at
      })
      .onConflict()
      .ignore()

    res.send({
      account,
      public_key,
      signature,
      created_at
    })
  } catch (error) {
    logger(error)
    res.status(500).send('Internal server error')
  }
})

export default router
