import express from 'express'
import {
  verify_nano_community_revoke_key_signature,
  decode_nano_address
} from '#common'

const router = express.Router()
const PUBLIC_KEY_RE = /^[0-9a-fA-F]{64}$/
const SIGNATURE_RE = /^[0-9a-fA-F]{128}$/

router.post('/key/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['public_key', 'signature']
    for (const prop of required) {
      if (!req.body[prop]) {
        return res.status(400).send({ error: `missing ${prop} param` })
      }
    }

    const { public_key, signature } = req.body

    if (typeof public_key !== 'string' || !PUBLIC_KEY_RE.test(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (typeof signature !== 'string' || !SIGNATURE_RE.test(signature)) {
      return res.status(401).send({ error: 'invalid signature param' })
    }

    const linked_key = await db('account_keys').where({ public_key }).first()

    if (!linked_key) {
      return res.status(401).send({ error: `key ${public_key} not found` })
    }

    if (linked_key.revoked_at) {
      return res
        .status(401)
        .send({ error: `key ${public_key} already revoked` })
    }

    const valid_signing_key_signature =
      verify_nano_community_revoke_key_signature({
        linked_public_key: public_key,
        either_public_key: public_key,
        signature
      })
    const { public_key: account_public_key } = decode_nano_address({
      address: linked_key.account
    })
    const valid_account_key_signature =
      verify_nano_community_revoke_key_signature({
        linked_public_key: public_key,
        either_public_key: account_public_key,
        signature
      })

    if (!valid_signing_key_signature && !valid_account_key_signature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const revoked_at = Math.floor(Date.now() / 1000)
    await db('account_keys')
      .update({ revoked_at, revoke_signature: signature })
      .where({ account: linked_key.account, public_key })

    res.status(200).send({
      account: linked_key.account,
      public_key,
      signature,
      created_at: linked_key.created_at,
      revoked_at
    })
  } catch (error) {
    console.log(error)
    logger(error)
    res.status(500).send('Internal server error')
  }
})

export default router
