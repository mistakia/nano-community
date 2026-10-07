/* global describe before afterEach it */
import chai from 'chai'
import chaiHTTP from 'chai-http'
import jwt from 'jsonwebtoken'

import server from '#api/server.mjs'
import config from '#config'
import knex from '#db'
import { mochaGlobalSetup } from './global.mjs'

chai.use(chaiHTTP)
const expect = chai.expect

// A valid Nano address (nano_ + 1 or 3 + 59 base32 chars) and a 64-char block
// hash, matching the ACCOUNT_REGEX / BLOCK_REGEX in src/views/pages/dynamic/index.mjs.
const ADDRESS = `nano_3${'1'.repeat(59)}`
const BLOCK_HASH = 'A'.repeat(64)
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const CRAWLER_UA = 'Googlebot/2.1 (+http://www.google.com/bot.html)'

describe('API /site-events', () => {
  before(async () => {
    await mochaGlobalSetup()
    await knex('site_client_hash_keys').del()
    await knex('site_events').del()
  })

  afterEach(async () => {
    await knex('site_client_hash_keys').del()
    await knex('site_events').del()
  })

  const post_page_view = (body = {}) =>
    chai
      .request(server)
      .post('/api/site-events')
      .set('User-Agent', DESKTOP_UA)
      .send({ site_event_name: 'page_view', request_path: '/', ...body })

  it('rejects an event name outside the closed set', async () => {
    const response = await chai
      .request(server)
      .post('/api/site-events')
      .set('User-Agent', DESKTOP_UA)
      .send({ site_event_name: 'not-a-real-event', request_path: '/' })
    expect(response).to.have.status(400)
    expect(response.body.error).to.equal('invalid site_event_name')
  })

  it('stores a page view with the shared fields and no raw IP', async () => {
    const response = await post_page_view({
      request_path: '/introduction/basics'
    })
    expect(response).to.have.status(201)
    const row = await knex('site_events').first()
    expect(row.site_event_name).to.equal('page_view')
    expect(row.request_path).to.equal('/introduction/basics')
    expect(row.anonymous_client_hash).to.match(/^[0-9a-f]{16}$/)
    expect(row.is_authenticated).to.equal(false)
    expect(row.is_bot_user_agent).to.equal(false)
    expect(row.device_type).to.equal('desktop')
    expect(row).to.not.have.property('ip')
    expect(JSON.stringify(row)).to.not.include('127.0.0.1')
  })

  it('normalizes a Nano address to :account and a block hash to :block', async () => {
    await post_page_view({ request_path: `/${ADDRESS}` })
    await post_page_view({ request_path: `/${BLOCK_HASH}` })
    const paths = (await knex('site_events').select('request_path')).map(
      (row) => row.request_path
    )
    expect(paths.sort()).to.deep.equal(['/:account', '/:block'])
  })

  it('stores the referrer host and referral tag sent by the client', async () => {
    await post_page_view({
      request_path: '/faqs',
      referrer_host: 'twitter.com',
      referral_tag: 'x-post-week-5'
    })
    const row = await knex('site_events').first()
    expect(row.referrer_host).to.equal('twitter.com')
    expect(row.referral_tag).to.equal('x-post-week-5')
  })

  it('hashes the same client identically within a day, keeping one key row', async () => {
    await post_page_view({ request_path: '/a' })
    await post_page_view({ request_path: '/b' })
    const rows = await knex('site_events').orderBy('occurred_at', 'asc')
    expect(rows[0].anonymous_client_hash).to.equal(
      rows[1].anonymous_client_hash
    )
    const keys = await knex('site_client_hash_keys')
    expect(keys).to.have.length(1)
  })

  it('flags a known crawler user agent as a bot', async () => {
    const response = await chai
      .request(server)
      .post('/api/site-events')
      .set('User-Agent', CRAWLER_UA)
      .send({ site_event_name: 'page_view', request_path: '/' })
    expect(response).to.have.status(201)
    const row = await knex('site_events').first()
    expect(row.is_bot_user_agent).to.equal(true)
  })

  it('sets is_authenticated when the request carries a valid session', async () => {
    const token = jwt.sign({ sub: 999 }, config.jwt.secret, {
      algorithm: 'HS256'
    })
    const response = await chai
      .request(server)
      .post('/api/site-events')
      .set('User-Agent', DESKTOP_UA)
      .set('Authorization', `Bearer ${token}`)
      .send({ site_event_name: 'page_view', request_path: '/authenticated' })
    expect(response).to.have.status(201)
    const row = await knex('site_events').first()
    expect(row.is_authenticated).to.equal(true)
  })

  it('writes no row for an excluded account', async () => {
    const original = config.site_events
      ? config.site_events.excluded_user_ids
      : undefined
    config.site_events = { excluded_user_ids: [4242] }
    try {
      const token = jwt.sign({ sub: 4242 }, config.jwt.secret, {
        algorithm: 'HS256'
      })
      const response = await chai
        .request(server)
        .post('/api/site-events')
        .set('User-Agent', DESKTOP_UA)
        .set('Authorization', `Bearer ${token}`)
        .send({ site_event_name: 'page_view', request_path: '/' })
      expect(response).to.have.status(201)
      const { count } = await knex('site_events').count('* as count').first()
      expect(Number(count)).to.equal(0)
    } finally {
      if (original === undefined) {
        delete config.site_events
      } else {
        config.site_events = { excluded_user_ids: original }
      }
    }
  })

  it('stores client_error with message and source details only', async () => {
    const response = await chai
      .request(server)
      .post('/api/site-events')
      .set('User-Agent', DESKTOP_UA)
      .send({
        site_event_name: 'client_error',
        request_path: '/',
        event_details: { message: 'boom', source: 'main.js' }
      })
    expect(response).to.have.status(201)
    const row = await knex('site_events').first()
    expect(row.site_event_name).to.equal('client_error')
    expect(row.event_details).to.deep.equal({
      message: 'boom',
      source: 'main.js'
    })
  })
})
