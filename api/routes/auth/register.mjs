import express from 'express'

import verify_community_request, {
  CommunityRequestError,
  expect_parameter_keys,
  is_public_key,
  send_request_error
} from '#libs-server/verify-community-request.mjs'

const router = express.Router()
const USERNAME_RE = /^[A-Za-z][a-zA-Z0-9_]+$/

const handle_request_error = ({ res, error }) => {
  if (error instanceof CommunityRequestError) {
    send_request_error({ res, error })
    return true
  }
  return false
}

// Registers a username for the signing key. The signature binds the username,
// and a registration older than the stored one is refused so a captured
// registration cannot restore a previous username.
router.post('/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    let verified
    try {
      verified = verify_community_request({
        wire_unit: req.body,
        actions: ['register_username']
      })
      expect_parameter_keys({
        parameters: verified.payload.parameters,
        keys: ['username']
      })
    } catch (error) {
      if (handle_request_error({ res, error })) return
      throw error
    }

    const { payload, public_key } = verified
    const { username } = payload.parameters

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return res.status(400).send({ error: 'invalid username' })
    }

    const username_taken = await db('users')
      .where({ username })
      .whereNot({ public_key })
      .first()
    if (username_taken) {
      return res.status(401).send({ error: 'username exists' })
    }

    const existing = await db('users').where({ public_key }).first()
    if (
      existing?.registration_message &&
      JSON.parse(existing.registration_message).issued_at >= payload.issued_at
    ) {
      return res
        .status(409)
        .send({ error: 'a newer registration exists for this key' })
    }

    const result = await db('users')
      .insert({
        public_key,
        username,
        signature: req.body.signature.toLowerCase(),
        registration_message: req.body.message,
        last_visit: Math.round(Date.now() / 1000)
      })
      .onConflict('public_key')
      .merge()
      .returning('id')

    return res.send({
      user_id: result[0].id,
      username
    })
  } catch (error) {
    console.log(error)
    logger(error)
    res.status(500).send('Internal server error')
  }
})

// Links a key to an account. It takes both keys' consent: the account signs
// link_key naming the key, and the key signs accept_link naming the account.
router.post('/key/?', async (req, res) => {
  const { logger, db } = req.app.locals
  try {
    let link
    let accept
    try {
      link = verify_community_request({
        wire_unit: req.body.link,
        actions: ['link_key']
      })
      accept = verify_community_request({
        wire_unit: req.body.accept,
        actions: ['accept_link']
      })
      expect_parameter_keys({
        parameters: link.payload.parameters,
        keys: ['linked_public_key']
      })
      expect_parameter_keys({
        parameters: accept.payload.parameters,
        keys: ['linked_account']
      })
    } catch (error) {
      if (handle_request_error({ res, error })) return
      throw error
    }

    const { linked_public_key } = link.payload.parameters
    const { linked_account } = accept.payload.parameters
    const account = link.payload.account

    if (!is_public_key(linked_public_key)) {
      return res.status(400).send({ error: 'invalid linked_public_key' })
    }
    if (linked_public_key !== accept.public_key) {
      return res
        .status(401)
        .send({ error: 'accept_link is not signed by the linked key' })
    }
    if (linked_account !== account) {
      return res
        .status(401)
        .send({ error: 'accept_link names a different account' })
    }
    if (linked_public_key === link.public_key) {
      return res
        .status(400)
        .send({ error: 'an account cannot link its own key' })
    }

    const previously_linked = await db('account_keys')
      .where({ public_key: linked_public_key })
      .first()
    if (previously_linked) {
      return res
        .status(409)
        .send({ error: 'key previously linked; generate a new key' })
    }

    const created_at = Math.round(Date.now() / 1000)
    await db('account_keys').insert({
      account,
      public_key: linked_public_key,
      link_signature: req.body.link.signature.toLowerCase(),
      link_message: req.body.link.message,
      accept_link_signature: req.body.accept.signature.toLowerCase(),
      accept_link_message: req.body.accept.message,
      created_at
    })

    res.send({
      account,
      public_key: linked_public_key,
      created_at
    })
  } catch (error) {
    if (error.code === '23505') {
      return res
        .status(409)
        .send({ error: 'key previously linked; generate a new key' })
    }
    logger(error)
    res.status(500).send('Internal server error')
  }
})

export default router
