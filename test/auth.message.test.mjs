/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import ed25519 from '@trashman/ed25519-blake2b'
import { hash_signed_message } from 'nano-signed-message'

import server from '#api/server.mjs'
import db from '#db'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  now_seconds,
  sign_community_request
} from './utils/sign-community-request.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const post_message = (body) =>
  chai.request(server).post('/api/auth/message').send(body)

const meta_parameters = (content) => ({ content, references: [], tags: [] })

const get_alias = async (account) => {
  const row = await db('accounts').where({ account }).first()
  return row && row.alias
}

describe('API /auth/message', function () {
  before(mochaGlobalSetup)

  this.timeout(10000)

  describe('POST /api/auth/message', () => {
    it('stores and applies a message from an account of any balance', async () => {
      const key = create_test_key()
      const wire = sign_community_request({
        key,
        action: 'set_account_meta',
        parameters: {
          content: { alias: 'small account' },
          references: ['ab'.repeat(32)],
          tags: ['one', 'two']
        }
      })

      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.stored).to.equal(true)
      expect(response.body.account).to.equal(key.account)

      const digest = Buffer.from(hash_signed_message(wire.message)).toString(
        'hex'
      )
      const row = await db('nano_community_messages')
        .where({ message_digest: digest })
        .first()
      expect(row.version).to.equal(2)
      expect(row.message).to.equal(wire.message)
      expect(row.signature).to.equal(wire.signature)
      expect(row.public_key).to.equal(key.public_key)
      expect(row.operation).to.equal('SET_ACCOUNT_META')
      expect(JSON.parse(row.content)).to.deep.equal({ alias: 'small account' })
      expect(row.tags).to.equal('one, two')
      expect(row.references).to.equal('ab'.repeat(32))
      expect(row.created_at).to.equal(JSON.parse(wire.message).issued_at)
      expect(await get_alias(key.account)).to.equal('small account')
    })

    it('accepts a block-envelope signature', async () => {
      const key = create_test_key()
      const wire = sign_community_request({
        key,
        action: 'set_account_meta',
        parameters: meta_parameters({ alias: 'block mode' }),
        mode: 'block'
      })

      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(await get_alias(key.account)).to.equal('block mode')
    })

    it('stores and applies a re-signed payload once', async () => {
      const key = create_test_key()
      const wire = sign_community_request({
        key,
        action: 'set_account_meta',
        parameters: meta_parameters({ alias: 'first' })
      })
      const first = await post_message(wire)
      expect(first.body.stored).to.equal(true)

      await db('accounts')
        .update({ alias: 'changed since' })
        .where({ account: key.account })

      // The native signer is hedged, so the same digest gets a new signature
      const digest = hash_signed_message(wire.message)
      const resigned = ed25519
        .sign(
          Buffer.from(digest),
          Buffer.from(key.private_key, 'hex'),
          Buffer.from(key.public_key, 'hex')
        )
        .toString('hex')
      expect(resigned).to.not.equal(wire.signature)

      const second = await post_message({ ...wire, signature: resigned })
      expect(second).to.have.status(200)
      expect(second.body.stored).to.equal(false)

      const replay = await post_message(wire)
      expect(replay).to.have.status(200)
      expect(replay.body.stored).to.equal(false)

      const rows = await db('nano_community_messages').where({
        message_digest: Buffer.from(digest).toString('hex')
      })
      expect(rows).to.have.length(1)
      expect(await get_alias(key.account)).to.equal('changed since')
    })

    it('applies a message signed by a linked key to its account', async () => {
      const account_key = create_test_key()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: account_key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: now_seconds()
      })

      const wire = sign_community_request({
        key: linked_key,
        action: 'set_account_meta',
        parameters: meta_parameters({ alias: 'via linked key' })
      })
      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.account).to.equal(account_key.account)
      expect(await get_alias(account_key.account)).to.equal('via linked key')
    })

    it('applies a message signed by a revoked key to the key itself', async () => {
      const account_key = create_test_key()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: account_key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: now_seconds(),
        revoked_at: now_seconds()
      })

      const wire = sign_community_request({
        key: linked_key,
        action: 'set_account_meta',
        parameters: meta_parameters({ alias: 'revoked key' })
      })
      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.account).to.equal(linked_key.account)
      expect(await get_alias(account_key.account)).to.equal(undefined)
    })
  })

  describe('errors', () => {
    const valid_wire = (overrides = {}) =>
      sign_community_request({
        key: create_test_key(),
        action: 'set_account_meta',
        parameters: meta_parameters({ alias: 'x' }),
        ...overrides
      })

    it('rejects tampered content with 401', async () => {
      const wire = valid_wire()
      const tampered = wire.message.replace('"alias":"x"', '"alias":"y"')
      const response = await post_message({ ...wire, message: tampered })
      expect(response).to.have.status(401)
    })

    it('rejects a version 1 message with 400', async () => {
      const response = await post_message({
        message: {
          version: 1,
          public_key: 'a'.repeat(64),
          operation: 'SET_ACCOUNT_META',
          content: '{}',
          tags: [],
          references: [],
          created_at: now_seconds(),
          signature: 'a'.repeat(128)
        }
      })
      expect(response).to.have.status(400)
    })

    it('rejects issued_at eleven minutes in the future or past', async () => {
      for (const offset of [660, -660]) {
        const response = await post_message(
          valid_wire({ issued_at: now_seconds() + offset })
        )
        expect(response, String(offset)).to.have.status(400)
        expect(response.body.error).to.include('window')
      }
    })

    it('rejects a message without a nonce', async () => {
      const response = await post_message(valid_wire({ nonce: null }))
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('nonce')
    })

    it('rejects another domain and a non-message action', async () => {
      const other_domain = await post_message(
        valid_wire({ domain: 'evil.example' })
      )
      expect(other_domain).to.have.status(400)

      const key = create_test_key()
      const link = sign_community_request({
        key,
        action: 'link_key',
        parameters: { linked_public_key: create_test_key().public_key }
      })
      const response = await post_message(link)
      expect(response).to.have.status(400)
    })

    it('rejects malformed parameters', async () => {
      const cases = [
        { content: { alias: 'x' }, references: [], tags: [], extra: 1 },
        { content: { alias: 'x' }, references: ['AB'.repeat(32)], tags: [] },
        { content: 'x', references: [], tags: [] },
        { content: {}, references: [], tags: [1] },
        { content: {}, references: [] }
      ]
      for (const parameters of cases) {
        const response = await post_message(valid_wire({ parameters }))
        expect(response, JSON.stringify(parameters)).to.have.status(400)
      }
    })
  })
})
