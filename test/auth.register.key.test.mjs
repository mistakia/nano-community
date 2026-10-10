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

const post_link = (body) =>
  chai.request(server).post('/api/auth/register/key').send(body)

describe('API /auth/register/key', () => {
  before(mochaGlobalSetup)

  describe('POST /api/auth/register/key', () => {
    it('links a key when the account and the key both sign', async () => {
      const account_key = create_test_key()
      const linked_key = create_test_key()
      const body = sign_link_request({ account_key, linked_key })

      const response = await post_link(body)
      expect(response).to.have.status(200)
      expect(response.body.account).to.equal(account_key.account)
      expect(response.body.public_key).to.equal(linked_key.public_key)

      const row = await knex('account_keys')
        .where({ public_key: linked_key.public_key })
        .first()
      expect(row.account).to.equal(account_key.account)
      expect(row.link_message).to.equal(body.link.message)
      expect(row.link_signature).to.equal(body.link.signature)
      expect(row.accept_link_message).to.equal(body.accept.message)
      expect(row.accept_link_signature).to.equal(body.accept.signature)
      expect(row.revoked_at).to.equal(null)
    })
  })

  describe('errors', () => {
    it('rejects a link signature reused for a different key', async () => {
      const account_key = create_test_key()
      const first = sign_link_request({
        account_key,
        linked_key: create_test_key()
      })
      const other_key = create_test_key()
      const second = sign_link_request({ account_key, linked_key: other_key })

      const response = await post_link({
        link: first.link,
        accept: second.accept
      })
      expect(response).to.have.status(401)
    })

    it('rejects a link without an accept_link unit', async () => {
      const { link } = sign_link_request({
        account_key: create_test_key(),
        linked_key: create_test_key()
      })
      const response = await post_link({ link })
      expect(response).to.have.status(400)
    })

    it('rejects an account linking a key it does not control', async () => {
      const attacker = create_test_key()
      const attacker_key = create_test_key()
      const victim_key = create_test_key()

      const link = sign_community_request({
        key: attacker,
        action: 'link_key',
        parameters: { linked_public_key: victim_key.public_key }
      })
      const accept = sign_community_request({
        key: attacker_key,
        action: 'accept_link',
        parameters: { linked_account: attacker.account }
      })

      const response = await post_link({ link, accept })
      expect(response).to.have.status(401)
      const row = await knex('account_keys')
        .where({ public_key: victim_key.public_key })
        .first()
      expect(row).to.equal(undefined)
    })

    it('rejects an accept_link that names a different account', async () => {
      const account_key = create_test_key()
      const linked_key = create_test_key()
      const { link } = sign_link_request({ account_key, linked_key })
      const accept = sign_community_request({
        key: linked_key,
        action: 'accept_link',
        parameters: { linked_account: create_test_key().account }
      })

      const response = await post_link({ link, accept })
      expect(response).to.have.status(401)
    })

    it('rejects a previously linked key with 409', async () => {
      const account_key = create_test_key()
      const linked_key = create_test_key()
      const first = await post_link(
        sign_link_request({ account_key, linked_key })
      )
      expect(first).to.have.status(200)

      const again = await post_link(
        sign_link_request({ account_key, linked_key })
      )
      expect(again).to.have.status(409)
      expect(again.body.error).to.equal(
        'key previously linked; generate a new key'
      )

      await knex('account_keys')
        .update({ revoked_at: 1 })
        .where({ public_key: linked_key.public_key })
      const other_account = await post_link(
        sign_link_request({ account_key: create_test_key(), linked_key })
      )
      expect(other_account).to.have.status(409)
    })

    it('rejects swapped units and units signed for another action', async () => {
      const body = sign_link_request({
        account_key: create_test_key(),
        linked_key: create_test_key()
      })
      const response = await post_link({ link: body.accept, accept: body.link })
      expect(response).to.have.status(400)
    })
  })
})
