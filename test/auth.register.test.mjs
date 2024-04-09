/* global describe before it */
import chai from 'chai'
import crypto from 'crypto'
import chaiHTTP from 'chai-http'
import { tools, wallet } from 'nanocurrency-web'

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
          address: 'someaddress',
          signature: 'somesignature',
          username: 'test_username'
        }) // missing public_key
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing public_key param')
    })

    it('should return 400 if address field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'somepub',
          signature: 'somesignature',
          username: 'test_username'
        }) // missing address
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing address param')
    })

    it('should return 400 if signature field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'somepub',
          address: 'someaddress',
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
          address: 'someaddress',
          signature: 'somesignature'
        }) // missing username
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing username param')
    })

    it('should return 401 if pub param is invalid', async () => {
      const w = wallet.generate()
      const account = w.accounts[0]

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: 'invalidpub',
          address: account.address,
          signature: 'somesignature',
          username: 'test_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid public_key param')
    })

    it('should return 401 if address param is invalid', async () => {
      const w = wallet.generate()
      const account = w.accounts[0]

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: account.publicKey,
          address: 'invalidaddress',
          signature: 'somesignature',
          username: 'test_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid address param')
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
        const w = wallet.generate()
        const account = w.accounts[0]

        const response = await chai
          .request(server)
          .post('/api/auth/register')
          .send({
            public_key: account.publicKey,
            address: account.address,
            signature: 'somesignature',
            username
          })
        expect(response).to.have.status(401)
        expect(response.body.error).to.equal('invalid username param')
      })
    })

    it('should return 401 if signature is invalid', async () => {
      const w = wallet.generate()
      const account = w.accounts[0]

      const signature = tools.sign(account.privateKey, 'some message')

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: account.publicKey,
          address: account.address,
          signature,
          username: 'test_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid signature')
    })

    it('should return 401 if username already exists', async () => {
      const seed = crypto.randomBytes(64).toString('hex')
      const accounts = wallet.accounts(seed, 0, 1)
      const account_0 = accounts[0]
      const account_1 = accounts[1]

      await knex('users').insert({
        id: 1,
        username: 'existing_username',
        public_key: account_0.publicKey,
        last_visit: Math.floor(Date.now() / 1000)
      })

      const signature = tools.sign(account_1.privateKey, account_1.publicKey)

      const response = await chai
        .request(server)
        .post('/api/auth/register')
        .send({
          public_key: account_1.publicKey,
          address: account_1.address,
          signature,
          username: 'existing_username'
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('username exists')
    })
  })
})
