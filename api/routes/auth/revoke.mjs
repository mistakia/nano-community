import express from 'express'

import verify_community_request, {
  CommunityRequestError,
  expect_parameter_keys,
  send_request_error
} from '#libs-server/verify-community-request.mjs'

const router = express.Router()

// Revokes a linked key. Accepted from the linked key itself or from the
// account it is linked to.
router.post('/key/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    let verified
    try {
      verified = verify_community_request({
        wire_unit: req.body,
        actions: ['revoke_key']
      })
      expect_parameter_keys({
        parameters: verified.payload.parameters,
        keys: ['linked_public_key']
      })
    } catch (error) {
      if (error instanceof CommunityRequestError) {
        return send_request_error({ res, error })
      }
      throw error
    }

    const { payload, public_key: signer_public_key } = verified
    const { linked_public_key } = payload.parameters

    const linked_key = await db('account_keys')
      .where({ public_key: linked_public_key })
      .first()

    if (!linked_key) {
      return res
        .status(401)
        .send({ error: `key ${linked_public_key} not found` })
    }

    if (linked_key.revoked_at) {
      return res
        .status(401)
        .send({ error: `key ${linked_public_key} already revoked` })
    }

    const signed_by_linked_key = signer_public_key === linked_public_key
    const signed_by_account = payload.account === linked_key.account
    if (!signed_by_linked_key && !signed_by_account) {
      return res
        .status(401)
        .send({ error: 'signer is neither the key nor its account' })
    }

    const revoked_at = Math.floor(Date.now() / 1000)
    await db('account_keys')
      .update({
        revoked_at,
        revoke_signature: req.body.signature.toLowerCase(),
        revoke_message: req.body.message
      })
      .where({ account: linked_key.account, public_key: linked_public_key })

    res.status(200).send({
      account: linked_key.account,
      public_key: linked_public_key,
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
