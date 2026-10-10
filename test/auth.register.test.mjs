/* global describe before it */
import chai from 'chai'
import chaiHTTP from 'chai-http'

import server from '#api/server.mjs'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  now_seconds,
  sign_community_request
} from './utils/sign-community-request.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const sign_registration = ({ key, username, issued_at }) =>
  sign_community_request({
    key,
    action: 'register_username',
    parameters: { username },
    issued_at
  })

const post_register = (body) =>
  chai.request(server).post('/api/auth/register').send(body)

describe('API /auth/register', () => {
  before(mochaGlobalSetup)

  describe('POST /api/auth/register', () => {
    it('registers the signed username', async () => {
      const key = create_test_key()
      const wire = sign_registration({ key, username: 'signed_name' })

      const response = await post_register(wire)
      expect(response).to.have.status(200)
      expect(response.body.username).to.equal('signed_name')

      const row = await knex('users')
        .where({ public_key: key.public_key })
        .first()
      expect(row.username).to.equal('signed_name')
      expect(row.registration_message).to.equal(wire.message)
      expect(row.signature).to.equal(wire.signature)
    })

    it('changes the username with a newer registration', async () => {
      const key = create_test_key()
      const now = now_seconds()
      await post_register(
        sign_registration({ key, username: 'first_name', issued_at: now - 10 })
      )
      const response = await post_register(
        sign_registration({ key, username: 'second_name', issued_at: now })
      )
      expect(response).to.have.status(200)
      const row = await knex('users')
        .where({ public_key: key.public_key })
        .first()
      expect(row.username).to.equal('second_name')
    })
  })

  describe('errors', () => {
    it('rejects a username signature reused for another username', async () => {
      const key = create_test_key()
      const wire = sign_registration({ key, username: 'real_name' })
      const response = await post_register({
        ...wire,
        message: wire.message.replace('real_name', 'other_name')
      })
      expect(response).to.have.status(401)
    })

    it('rejects a replayed older registration', async () => {
      const key = create_test_key()
      const now = now_seconds()
      const old_registration = sign_registration({
        key,
        username: 'old_name',
        issued_at: now - 10
      })
      expect(await post_register(old_registration)).to.have.status(200)
      expect(
        await post_register(
          sign_registration({ key, username: 'new_name', issued_at: now })
        )
      ).to.have.status(200)

      const replay = await post_register(old_registration)
      expect(replay).to.have.status(409)
      const row = await knex('users')
        .where({ public_key: key.public_key })
        .first()
      expect(row.username).to.equal('new_name')
    })

    it('rejects a username held by another key', async () => {
      await post_register(
        sign_registration({ key: create_test_key(), username: 'taken_name' })
      )
      const response = await post_register(
        sign_registration({ key: create_test_key(), username: 'taken_name' })
      )
      expect(response).to.have.status(401)
      expect(response.body.error).to.equal('username exists')
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
      it(`rejects an invalid username: ${username}`, async () => {
        const response = await post_register(
          sign_registration({ key: create_test_key(), username })
        )
        expect(response).to.have.status(400)
        expect(response.body.error).to.equal('invalid username')
      })
    })

    it('rejects a version 1 registration', async () => {
      const response = await post_register({
        public_key: 'a'.repeat(64),
        signature: 'a'.repeat(128),
        username: 'test_username'
      })
      expect(response).to.have.status(400)
    })
  })
})

describe('API /auth/register binding regression', () => {
  before(mochaGlobalSetup)

  it('register_username: registers only the signed username', async () => {
    const key = create_test_key()
    const wire = sign_registration({ key, username: 'signed_only' })
    const response = await post_register({
      ...wire,
      username: 'injected_name',
      public_key: create_test_key().public_key
    })
    expect(response).to.have.status(200)
    expect(response.body.username).to.equal('signed_only')

    const row = await knex('users')
      .where({ public_key: key.public_key })
      .first()
    expect(row.username).to.equal('signed_only')
    const injected = await knex('users')
      .where({ username: 'injected_name' })
      .first()
    expect(injected).to.equal(undefined)
  })
})
