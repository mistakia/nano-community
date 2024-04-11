/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import ed25519 from '@trashman/ed25519-blake2b'
import nock from 'nock'

import server from '#api/server.mjs'
import { sign_nano_community_message } from '#common'
import { mochaGlobalSetup } from './global.mjs'
import db from '#db'
import {
  REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT,
  ACCOUNT_TRACKING_MINIMUM_BALANCE
} from '#constants'

process.env.NODE_ENV = 'test'
// chai.should()
chai.use(chaiHTTP)
const expect = chai.expect

describe('API /auth/message', function () {
  before(mochaGlobalSetup)

  this.timeout(10000)

  describe('POST /api/auth/message', () => {
    it('should save message to database for nano account above balance threshold', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const message = {
        version: 1,
        public_key: public_key.toString('hex'),
        operation: 'SET',
        content:
          'should save message to database for nano account above balance threshold',
        tags: [],
        references: [],
        created_at: Math.floor(Date.now() / 1000)
      }

      const signature = sign_nano_community_message(message, private_key)

      // Mocking the rpc request to simulate an account above the balance threshold
      nock('http://nano:7076')
        .post('/', (body) => body.action === 'account_info')
        .reply(200, {
          balance: String(ACCOUNT_TRACKING_MINIMUM_BALANCE)
        })

      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            ...message,
            signature: signature.toString('hex')
          }
        })

      expect(response).to.have.status(200)

      const saved_message = await db('nano_community_messages')
        .where({
          public_key: message.public_key,
          created_at: message.created_at,
          content: message.content
        })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(saved_message).to.exist
      expect(saved_message.content).to.equal(message.content)
      expect(saved_message.operation).to.equal(message.operation)
      expect(saved_message.version).to.equal(message.version)
      expect(saved_message.public_key).to.equal(message.public_key)
      expect(saved_message.signature).to.equal(signature.toString('hex'))
      expect(saved_message.created_at).to.equal(message.created_at)
    })

    it('should save message to database for nano representative above weight threshold', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const message = {
        version: 1,
        public_key: public_key.toString('hex'),
        operation: 'SET',
        content:
          'should save message to database for nano representative above weight threshold',
        tags: [],
        references: [],
        created_at: Math.floor(Date.now() / 1000)
      }

      const signature = sign_nano_community_message(message, private_key)

      // Mocking the rpc request to simulate a representative above the weight threshold
      nock('http://nano:7076')
        .post('/', (body) => body.action === 'account_info')
        .reply(200, {
          weight: String(REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT)
        })

      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            ...message,
            signature: signature.toString('hex')
          }
        })

      expect(response).to.have.status(200)

      const saved_message = await db('nano_community_messages')
        .where({
          public_key: message.public_key,
          created_at: message.created_at,
          content: message.content
        })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(saved_message).to.exist
      expect(saved_message.content).to.equal(message.content)
      expect(saved_message.operation).to.equal(message.operation)
      expect(saved_message.version).to.equal(message.version)
      expect(saved_message.public_key).to.equal(message.public_key)
      expect(saved_message.signature).to.equal(signature.toString('hex'))
      expect(saved_message.created_at).to.equal(message.created_at)
    })
  })

  describe('errors', () => {
    it('should return 400 for invalid message version', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 2, // invalid version
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid message version')
    })

    it('should return 400 for invalid entry_id length', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            entry_id: '123', // invalid entry_id length
            version: 1, // valid version
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid entry_id')
    })

    it('should return 400 for invalid chain_id length', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            chain_id: '123', // invalid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid chain_id')
    })

    it('should return 400 for negative entry_clock', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            entry_clock: -1, // negative entry_clock
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid entry_clock')
    })

    it('should return 400 for negative chain_clock', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            chain_clock: -1, // negative chain_clock
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid chain_clock')
    })

    it('should return 400 for invalid public_key length', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            public_key: '123', // invalid public_key length
            chain_id: 'a'.repeat(64), // valid chain_id length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid public_key')
    })

    it('should return 400 for invalid operation', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            operation: 'INVALID', // invalid operation
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid operation')
    })

    it('should return 400 for non-string content', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            content: 123, // non-string content
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid content')
    })

    it('should return 400 for invalid tags type', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            tags: 'not an array', // invalid tags type
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid tags')
    })

    it('should return 400 for invalid references type', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            references: 'not an array', // invalid references type
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid references')
    })

    it('should return 400 for negative created_at', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            created_at: -1, // negative created_at
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET',
            signature: 'a'.repeat(128) // valid signature length
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid created_at')
    })

    it('should return 400 for invalid signature length', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            version: 1,
            signature: '123', // invalid signature length
            chain_id: 'a'.repeat(64), // valid chain_id length
            public_key: 'a'.repeat(64), // valid public_key length
            operation: 'SET'
          }
        })
      expect(response).to.have.status(400)
      expect(response.text).to.include('Invalid signature')
    })

    it('should not save message to database for nano account below balance threshold', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const message = {
        version: 1,
        public_key: public_key.toString('hex'),
        operation: 'SET',
        content:
          'should not save message to database for nano account below balance threshold',
        tags: [],
        references: [],
        created_at: Math.floor(Date.now() / 1000)
      }

      const signature = sign_nano_community_message(message, private_key)

      // Mocking the rpc request to simulate an account below the balance threshold
      nock('http://nano:7076')
        .post('/', (body) => body.action === 'account_info')
        .reply(200, {
          balance: String(ACCOUNT_TRACKING_MINIMUM_BALANCE - 1n)
        })

      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            ...message,
            signature: signature.toString('hex')
          }
        })

      expect(response).to.have.status(200)

      const saved_message = await db('nano_community_messages')
        .where({
          public_key: message.public_key,
          created_at: message.created_at,
          content: message.content
        })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(saved_message).to.be.undefined
    })

    it('should not save message to database for nano representative below weight threshold', async () => {
      const private_key = Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const public_key = ed25519.publicKey(private_key)

      const message = {
        version: 1,
        public_key: public_key.toString('hex'),
        operation: 'SET',
        content:
          'should not save message to database for nano representative below weight threshold',
        tags: [],
        references: [],
        created_at: Math.floor(Date.now() / 1000)
      }

      const signature = sign_nano_community_message(message, private_key)

      // Mocking the rpc request to simulate a representative below the weight threshold
      nock('http://nano:7076')
        .post('/', (body) => body.action === 'account_info')
        .reply(200, {
          weight: String(REPRESENTATIVE_TRACKING_MINIMUM_VOTING_WEIGHT - 1n)
        })

      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send({
          message: {
            ...message,
            signature: signature.toString('hex')
          }
        })

      expect(response).to.have.status(200)

      const saved_message = await db('nano_community_messages')
        .where({
          public_key: message.public_key,
          created_at: message.created_at,
          content: message.content
        })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(saved_message).to.be.undefined
    })

    it('should not save message if linked public key is already revoked', async () => {
      // TODO
    })
  })
})
