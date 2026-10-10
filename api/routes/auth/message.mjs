import express from 'express'

import { process_community_message } from '#libs-server'
import verify_community_request, {
  CommunityRequestError,
  expect_parameter_keys,
  is_block_hash,
  is_plain_object,
  send_request_error
} from '#libs-server/verify-community-request.mjs'

const router = express.Router()

const MESSAGE_ACTIONS = [
  'set_account_meta',
  'set_representative_meta',
  'set_block_meta'
]
const PARAMETER_KEYS = ['content', 'references', 'tags']

const validate_parameters = (parameters) => {
  expect_parameter_keys({ parameters, keys: PARAMETER_KEYS })

  const { content, references, tags } = parameters
  if (!is_plain_object(content)) {
    throw new CommunityRequestError(400, 'content must be an object')
  }
  if (!Array.isArray(references) || !references.every(is_block_hash)) {
    throw new CommunityRequestError(
      400,
      'references must be an array of lowercase block hashes'
    )
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
    throw new CommunityRequestError(400, 'tags must be an array of strings')
  }
}

router.post('/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    let verified
    try {
      verified = verify_community_request({
        wire_unit: req.body,
        actions: MESSAGE_ACTIONS
      })
      validate_parameters(verified.payload.parameters)
    } catch (error) {
      if (error instanceof CommunityRequestError) {
        return send_request_error({ res, error })
      }
      throw error
    }

    const { payload, public_key, message_digest } = verified
    const { content, references, tags } = payload.parameters

    // A linked key acts for the account it is linked to
    const linked_key = await db('account_keys')
      .select('account')
      .where({ public_key })
      .whereNull('revoked_at')
      .first()
    const account = linked_key ? linked_key.account : payload.account

    // Deduplicate by digest: a re-signed payload has a new signature but the
    // same digest, so it is stored and applied once
    const inserted = await db('nano_community_messages')
      .insert({
        version: 2,
        message: req.body.message,
        message_digest,
        public_key,
        operation: payload.action.toUpperCase(),
        content: JSON.stringify(content),
        tags: tags.length ? tags.join(', ') : null,
        references: references.length ? references.join(', ') : null,
        created_at: payload.issued_at,
        signature: req.body.signature.toLowerCase()
      })
      .onConflict('message_digest')
      .ignore()
      .returning('message_digest')

    if (inserted.length) {
      try {
        await process_community_message({
          action: payload.action,
          content,
          account
        })
      } catch (error) {
        logger(error)
      }
    }

    res.status(200).send({
      account,
      message_digest,
      stored: inserted.length > 0,
      payload
    })
  } catch (error) {
    console.log(error)
    logger(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
