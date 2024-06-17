import express from 'express'
import ed25519 from '@trashman/ed25519-blake2b'

import {
  verify_nano_community_link_key_signature,
  is_nano_address_valid,
  decode_nano_address
} from '#common'

const router = express.Router()
const USERNAME_RE = /^[A-Za-z][a-zA-Z0-9_]+$/
const PUBLIC_KEY_RE = /^[0-9a-fA-F]{64}$/
const SIGNATURE_RE = /^[0-9a-fA-F]{128}$/

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

    if (typeof public_key !== 'string' || !PUBLIC_KEY_RE.test(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (!USERNAME_RE.test(username)) {
      return res.status(401).send({ error: 'invalid username param' })
    }

    if (typeof signature !== 'string' || !SIGNATURE_RE.test(signature)) {
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

    if (typeof public_key !== 'string' || !PUBLIC_KEY_RE.test(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (!is_nano_address_valid(account)) {
      return res.status(401).send({ error: 'invalid account param' })
    }

    if (typeof signature !== 'string' || !SIGNATURE_RE.test(signature)) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const { public_key: account_public_key } = decode_nano_address({
      address: account
    })
    const valid_signature = verify_nano_community_link_key_signature({
      linked_public_key: public_key,
      nano_account: account,
      nano_account_public_key: account_public_key,
      signature
    })
    if (!valid_signature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const created_at = Math.round(Date.now() / 1000)
    await db('account_keys')
      .insert({
        account,
        public_key,
        link_signature: signature,
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
