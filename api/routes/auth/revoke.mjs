import express from 'express'
import {
  verify_nano_community_revoke_key_signature,
  is_nano_address_valid,
  decode_nano_address
} from '#common'

const router = express.Router()
const PUBLIC_KEY_RE = /^[0-9a-fA-F]{64}$/
const SIGNATURE_RE = /^[0-9a-fA-F]{128}$/

router.post('/key/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    const required = ['account', 'public_key', 'signature']
    for (const prop of required) {
      if (!req.body[prop]) {
        return res.status(400).send({ error: `missing ${prop} param` })
      }
    }

    const { account, public_key, signature } = req.body

    if (!is_nano_address_valid(account)) {
      return res.status(401).send({ error: 'invalid account param' })
    }

    if (typeof public_key !== 'string' || !PUBLIC_KEY_RE.test(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (typeof signature !== 'string' || !SIGNATURE_RE.test(signature)) {
      return res.status(401).send({ error: 'invalid signature param' })
    }

    const { public_key: account_public_key } = decode_nano_address({
      address: account
    })
    const valid_signature = verify_nano_community_revoke_key_signature({
      linked_public_key: public_key,
      nano_account: account,
      nano_account_public_key: account_public_key,
      signature
    })
    if (!valid_signature) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const linked_key = await db('account_keys')
      .where({ account, public_key })
      .first()

    if (!linked_key) {
      return res
        .status(401)
        .send({ error: `key ${public_key} not linked to account ${account}` })
    }

    if (linked_key.revoked_at) {
      return res
        .status(401)
        .send({ error: `key ${public_key} already revoked` })
    }

    const revoked_at = Math.floor(Date.now() / 1000)
    await db('account_keys')
      .update({ revoked_at, revoke_signature: signature })
      .where({ account, public_key })

    res.status(200).send({
      account,
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
