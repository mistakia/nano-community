/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import ed25519 from '@trashman/ed25519-blake2b'
import nano from 'nanocurrency'

import server from '#api/server.mjs'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'

process.env.NODE_ENV = 'test'
// chai.should()
chai.use(chaiHTTP)
const expect = chai.expect

describe('API /auth/register/key', () => {
  before(mochaGlobalSetup)

  describe('POST /api/auth/register/key', () => {
    it('should save the supplied public_key', async () => {
      const private_key = Buffer.from(
        '00000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const nano_account_private_key = Buffer.from(
        '00000000000000000000000000000000000000000000000000000000000000001',
        'hex'
      )
      const nano_account_public_key = ed25519.publicKey(
        nano_account_private_key
      )
      const nano_account = nano.deriveAddress(
        nano_account_public_key.toString('hex')
      )

      const signature = ed25519.sign(
        public_key.toString('hex'),
        nano_account_private_key,
        nano_account_public_key
      )

      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: public_key.toString('hex'),
          signature: signature.toString('hex'),
          account: nano_account
        })

      expect(response).to.have.status(200)

      const saved_row = await knex('account_keys')
        .where({ public_key: public_key.toString('hex') })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(saved_row).to.exist
      expect(saved_row.account).to.equal(nano_account)
      expect(saved_row.public_key).to.equal(public_key.toString('hex'))
      expect(saved_row.signature).to.equal(signature.toString('hex'))
      expect(saved_row.created_at).to.be.a('number')
      expect(saved_row.created_at).to.equal(response.body.created_at)
    })
  })

  describe('errors', () => {
    it('should return 400 if public_key field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          signature: 'somesignature',
          account: 'someaccount'
        }) // missing public_key
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing public_key param')
    })

    it('should return 400 if signature field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: 'somepub',
          account: 'someaccount'
        }) // missing signature
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing signature param')
    })

    it('should return 400 if account field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: 'somepub',
          signature: 'somesignature'
        }) // missing account
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing account param')
    })

    it('should return 401 if public_key param is invalid', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: 'invalidpub',
          signature: 'somesignature',
          account: 'someaccount'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid public_key param')
    })

    it('should return 401 if account param is invalid', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)
      const account = 'someaccount'
      const signature = ed25519.sign(public_key, private_key, public_key)
      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: public_key.toString('hex'),
          signature: signature.toString('hex'),
          account
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid account param')
    })

    it('should return 401 if signature is invalid', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const nano_account = nano.deriveAddress(
        '0000000000000000000000000000000000000000000000000000000000000001'
      )

      // private key used is different from the stated nano account
      const nano_account_private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000002',
        'hex'
      )
      const nano_account_public_key = ed25519.publicKey(
        nano_account_private_key
      )
      const signature = ed25519.sign(
        public_key,
        nano_account_private_key,
        nano_account_public_key
      )

      const response = await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: public_key.toString('hex'),
          signature: signature.toString('hex'),
          account: nano_account
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid signature')
    })
  })
})
