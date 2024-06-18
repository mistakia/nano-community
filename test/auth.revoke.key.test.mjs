/* global describe, before, it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import ed25519 from '@trashman/ed25519-blake2b'

import server from '#api/server.mjs'
import knex from '#db'
import {
  sign_nano_community_link_key,
  sign_nano_community_revoke_key,
  encode_nano_address
} from '#common'
import { mochaGlobalSetup } from './global.mjs'

process.env.NODE_ENV = 'test'
// chai.should()
chai.use(chaiHTTP)
const expect = chai.expect

describe('API /auth/revoke/key', () => {
  before(mochaGlobalSetup)

  describe('POST /api/auth/revoke/key', () => {
    it('should register and then revoke an existing linked public key (using the account private key)', async () => {
      const nano_account_private_key = Buffer.from(
        '00000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const nano_account_public_key = ed25519.publicKey(
        nano_account_private_key
      )

      const new_signing_private_key = Buffer.from(
        '00000000000000000000000000000000000000000000000000000000000000001',
        'hex'
      )
      const new_signing_public_key = ed25519.publicKey(new_signing_private_key)
      const nano_account = encode_nano_address({
        public_key_buf: nano_account_public_key
      })

      // Register/Link the key
      const link_signature = sign_nano_community_link_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        nano_account,
        nano_account_private_key,
        nano_account_public_key
      })

      await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: link_signature.toString('hex'),
          account: nano_account
        })

      // Revoke the key
      const revoke_signature = sign_nano_community_revoke_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        either_private_key: nano_account_private_key,
        either_public_key: nano_account_public_key.toString('hex')
      })

      const response = await chai
        .request(server)
        .post('/api/auth/revoke/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: revoke_signature.toString('hex'),
          account: nano_account
        })

      expect(response).to.have.status(200)

      const revoked_row = await knex('account_keys')
        .where({ public_key: new_signing_public_key.toString('hex') })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(revoked_row).to.exist
      expect(revoked_row.account).to.equal(nano_account)
      expect(revoked_row.public_key).to.equal(
        new_signing_public_key.toString('hex')
      )
      expect(revoked_row.revoke_signature).to.equal(
        revoke_signature.toString('hex')
      )
      expect(revoked_row.revoked_at).to.be.a('number')
    })

    it('should register and then revoke an existing linked public key (using the signing private key)', async () => {
      const nano_account_private_key = Buffer.from(
        '000000000000000000000000000000000000000000000000000000000000000FF',
        'hex'
      )
      const nano_account_public_key = ed25519.publicKey(
        nano_account_private_key
      )

      const new_signing_private_key = Buffer.from(
        '00000000000000000000000000000000000000000000000000000000000000FFF',
        'hex'
      )
      const new_signing_public_key = ed25519.publicKey(new_signing_private_key)
      const nano_account = encode_nano_address({
        public_key_buf: nano_account_public_key
      })

      // Register/Link the key
      const link_signature = sign_nano_community_link_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        nano_account,
        nano_account_private_key,
        nano_account_public_key
      })

      await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: link_signature.toString('hex'),
          account: nano_account
        })

      // Revoke the key using the signing private key
      const revoke_signature = sign_nano_community_revoke_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        either_private_key: new_signing_private_key,
        either_public_key: new_signing_public_key.toString('hex')
      })

      const response = await chai
        .request(server)
        .post('/api/auth/revoke/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: revoke_signature.toString('hex'),
          account: nano_account
        })

      expect(response).to.have.status(200)

      const revoked_row = await knex('account_keys')
        .where({ public_key: new_signing_public_key.toString('hex') })
        .first()

      // eslint-disable-next-line no-unused-expressions
      expect(revoked_row).to.exist
      expect(revoked_row.account).to.equal(nano_account)
      expect(revoked_row.public_key).to.equal(
        new_signing_public_key.toString('hex')
      )
      expect(revoked_row.revoke_signature).to.equal(
        revoke_signature.toString('hex')
      )
      expect(revoked_row.revoked_at).to.be.a('number')
    })
  })

  describe('errors', () => {
    it('should return 400 if public_key field is missing', async () => {
      const response = await chai
        .request(server)
        .post('/api/auth/revoke/key')
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
        .post('/api/auth/revoke/key')
        .send({
          public_key: 'somepub',
          account: 'someaccount'
        }) // missing signature
      expect(response).to.have.status(400)
      expect(response.body.error).to.include('missing signature param')
    })

    it('should return 401 if public_key param is invalid', async () => {
      const nano_account = encode_nano_address({
        public_key_buf: Buffer.from(
          '0000000000000000000000000000000000000000000000000000000000000001',
          'hex'
        )
      })
      const response = await chai
        .request(server)
        .post('/api/auth/revoke/key')
        .send({
          public_key: 'invalidpub',
          signature: 'somesignature',
          account: nano_account
        })
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid public_key param')
    })

    it('should return 401 if signature is invalid', async () => {
      // Generate a new account key pair
      const new_account_private_key = Buffer.from(
        '3000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const new_account_public_key = ed25519.publicKey(new_account_private_key)
      const new_nano_account = encode_nano_address({
        public_key_buf: new_account_public_key
      })

      // Generate a new signing key pair
      const new_signing_private_key = Buffer.from(
        '4000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const new_signing_public_key = ed25519.publicKey(new_signing_private_key)

      // Generate a link signature for the new signing key using the new account key
      const link_signature = sign_nano_community_link_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        nano_account: new_nano_account,
        nano_account_private_key: new_account_private_key,
        nano_account_public_key: new_account_public_key
      })

      // Register the new signing key with the link signature
      await chai
        .request(server)
        .post('/api/auth/register/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: link_signature.toString('hex'),
          account: new_nano_account
        })

      // Attempt to revoke with an invalid signature
      const invalid_private_key = Buffer.from(
        '2000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      )
      const invalid_signature = sign_nano_community_revoke_key({
        linked_public_key: new_signing_public_key.toString('hex'),
        either_private_key: invalid_private_key,
        either_public_key: new_signing_public_key.toString('hex')
      })

      const response = await chai
        .request(server)
        .post('/api/auth/revoke/key')
        .send({
          public_key: new_signing_public_key.toString('hex'),
          signature: invalid_signature.toString('hex'),
          account: new_nano_account
        })

      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('invalid signature')
    })

    it('should return 401 if linked public key is not registered', async () => {
      // TODO
    })

    it('should return 401 if linked public key is already revoked', async () => {
      // TODO
    })
  })
})
