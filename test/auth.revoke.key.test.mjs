/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'

import server from '#api/server.mjs'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  sign_community_request,
  sign_link_request
} from './utils/sign-community-request.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const link = async () => {
  const account_key = create_test_key()
  const linked_key = create_test_key()
  const response = await chai
    .request(server)
    .post('/api/auth/register/key')
    .send(sign_link_request({ account_key, linked_key }))
  expect(response).to.have.status(200)
  return { account_key, linked_key }
}

const sign_revoke = ({ key, linked_public_key }) =>
  sign_community_request({
    key,
    action: 'revoke_key',
    parameters: { linked_public_key }
  })

const post_revoke = (body) =>
  chai.request(server).post('/api/auth/revoke/key').send(body)

const get_row = (public_key) =>
  knex('account_keys').where({ public_key }).first()

describe('API /auth/revoke/key', () => {
  before(mochaGlobalSetup)

  describe('POST /api/auth/revoke/key', () => {
    it('revokes a key with the key itself', async () => {
      const { account_key, linked_key } = await link()
      const wire = sign_revoke({
        key: linked_key,
        linked_public_key: linked_key.public_key
      })

      const response = await post_revoke(wire)
      expect(response).to.have.status(200)
      expect(response.body.account).to.equal(account_key.account)

      const row = await get_row(linked_key.public_key)
      expect(row.revoked_at).to.be.a('number')
      expect(row.revoke_message).to.equal(wire.message)
      expect(row.revoke_signature).to.equal(wire.signature)
    })

    it('revokes a key with the account key', async () => {
      const { account_key, linked_key } = await link()
      const response = await post_revoke(
        sign_revoke({
          key: account_key,
          linked_public_key: linked_key.public_key
        })
      )
      expect(response).to.have.status(200)
      expect((await get_row(linked_key.public_key)).revoked_at).to.be.a(
        'number'
      )
    })
  })

  describe('errors', () => {
    it('rejects a signer that is neither the key nor its account', async () => {
      const { linked_key } = await link()
      const response = await post_revoke(
        sign_revoke({
          key: create_test_key(),
          linked_public_key: linked_key.public_key
        })
      )
      expect(response).to.have.status(401)
      expect((await get_row(linked_key.public_key)).revoked_at).to.equal(null)
    })

    it('rejects a revoke signature reused for another key', async () => {
      const first = await link()
      const second = await link()
      const wire = sign_revoke({
        key: first.linked_key,
        linked_public_key: first.linked_key.public_key
      })
      const response = await post_revoke({
        ...wire,
        message: wire.message.replace(
          first.linked_key.public_key,
          second.linked_key.public_key
        )
      })
      expect(response).to.have.status(401)
      expect((await get_row(second.linked_key.public_key)).revoked_at).to.equal(
        null
      )
    })

    it('rejects an unknown key and an already revoked key', async () => {
      const unknown = create_test_key()
      const not_found = await post_revoke(
        sign_revoke({ key: unknown, linked_public_key: unknown.public_key })
      )
      expect(not_found).to.have.status(401)

      const { linked_key } = await link()
      const wire = sign_revoke({
        key: linked_key,
        linked_public_key: linked_key.public_key
      })
      expect(await post_revoke(wire)).to.have.status(200)
      const again = await post_revoke(
        sign_revoke({
          key: linked_key,
          linked_public_key: linked_key.public_key
        })
      )
      expect(again).to.have.status(401)
      expect(again.body.error).to.include('already revoked')
    })

    it('rejects a version 1 revoke request', async () => {
      const response = await post_revoke({
        public_key: 'a'.repeat(64),
        signature: 'a'.repeat(128)
      })
      expect(response).to.have.status(400)
    })
  })
})
