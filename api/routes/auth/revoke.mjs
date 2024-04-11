import express from 'express'
import nano from 'nanocurrency'
import { verify_nano_community_revoke_key_signature } from '#common'

const router = express.Router()

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

    if (!nano.checkAddress(account)) {
      return res.status(401).send({ error: 'invalid account param' })
    }

    if (!nano.checkKey(public_key)) {
      return res.status(401).send({ error: 'invalid public_key param' })
    }

    if (!nano.checkSignature(signature)) {
      return res.status(401).send({ error: 'invalid signature' })
    }

    const account_public_key = nano.derivePublicKey(account)
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
