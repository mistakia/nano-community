/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import ed25519 from '@trashman/ed25519-blake2b'

import server from '#api/server.mjs'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'

process.env.NODE_ENV = 'test'
// chai.should()
chai.use(chaiHTTP)
const expect = chai.expect

describe('API /auth/register', () => {
  before(mochaGlobalSetup)

  describe('errors', () => {
    it('should return 400 if pub field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          signature: 'somesignature',
          username: 'test_username'
        }) // missing public_key
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing public_key param')
    })

    it('should return 400 if signature field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'somepub',
          username: 'test_username'
        }) // missing signature
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing signature param')
    })

    it('should return 400 if username field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'somepub',
          signature: 'somesignature'
        }) // missing username
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing username param')
    })

    it('should return 401 if pub param is invalid', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'invalidpub',
          signature: 'somesignature',
          username: 'test_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid public_key param')
    })

    const invalid_usernames = [
      'contains space',
      'constains@character',
      '1starts_with_number',
      'contains!character',
      'contains.period',
      'contains-hyphen',
      'contains$dollar',
      'contains#hash'
    ]

    invalid_usernames.forEach((username) => {
      it(`should return 401 if username param is invalid: ${username}`, async () => {
        const private_key = Buffer.from(
          '0000000000000000000000000000000000000000000000000000000000000000',
          'hex'
        )
        const public_key = ed25519.publicKey(private_key)

        const response = await chai
          .request(server)
          .post('/api/auth/register')
          .send({
            public_key: public_key.toString('hex'),
            signature: 'somesignature',
            username
          })
        expect(response).to.have.status(401)
        expect(response.body.error).to.equal('invalid username param')
      })
    })

    it('should return 401 if signature is invalid', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)
      const signature = ed25519.sign(public_key, private_key, public_key)

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: public_key.toString('hex'),
          signature: signature.toString('hex'),
          username: 'test_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid signature')
    })

    it('should return 401 if username already exists', async () => {
      const private_key_0 = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key_0 = ed25519.publicKey(private_key_0)
      const signature_0 = ed25519.sign(
        public_key_0.toString('hex'),
        private_key_0,
        public_key_0
      )

      const private_key_1 = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000001',
        'hex'
      )
      const public_key_1 = ed25519.publicKey(private_key_1)
      const signature_1 = ed25519.sign(
        public_key_1.toString('hex'),
        private_key_1,
        public_key_1
      )

      await knex('users').insert({
        id: 1,
        username: 'existing_username',
        public_key: public_key_0.toString('hex'),
        signature: signature_0.toString('hex'),
        last_visit: Math.floor(Date.now() / 1000)
      })

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: public_key_1.toString('hex'),
          signature: signature_1.toString('hex'),
          username: 'existing_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('username exists')
    })
  })
})
