/* global describe before beforeEach it */
import chai from 'chai'
import chaiHTTP from 'chai-http'

import server from '#api/server.mjs'
import db from '#db'
import cache from '#api/cache.mjs'
import {
  resolve_account_labels,
  materialize_account_labels,
  sync_account_label_sources
} from '#libs-server/account-labels/index.mjs'
import {
  parse_nano_to,
  parse_nanolooker
} from '#libs-server/account-labels/directory-sources.mjs'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  sign_community_request
} from './utils/sign-community-request.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const claim = (overrides) => ({
  account: 'nano_x',
  label_type: 'alias',
  value: 'name',
  source: 'nano.to',
  observed_at: 100,
  expires_at: null,
  ...overrides
})

const get_account = (account) => db('accounts').where({ account }).first()
const get_tags = async (account) =>
  (await db('accounts_tags').where({ account }).orderBy('tag')).map(
    (row) => row.tag
  )

const directory = ({ source, entries }) => ({
  source,
  url: `fixture://${source}`,
  parse: parse_nano_to,
  entries
})

const sync = ({ sources, now }) =>
  sync_account_label_sources({
    sources,
    now,
    fetch_json: async (url) => {
      const source = sources.find((s) => s.url === url)
      if (source.entries instanceof Error) throw source.entries
      return source.entries
    }
  })

describe('account labels', function () {
  this.timeout(10000)

  before(mochaGlobalSetup)

  describe('resolve_account_labels', () => {
    it('picks the alias of the most trusted source', () => {
      const { alias } = resolve_account_labels({
        claims: [
          claim({ source: 'nanotipbot', value: 'tipbot', observed_at: 300 }),
          claim({ source: 'nano.to', value: 'nano.to name' }),
          claim({ source: 'signed-message', value: 'own name' })
        ],
        now: 200
      })
      expect(alias).to.equal('own name')
    })

    it('breaks a trust tie by the newest claim', () => {
      const { alias } = resolve_account_labels({
        claims: [
          claim({ value: 'old', observed_at: 100 }),
          claim({ value: 'new', observed_at: 150 })
        ],
        now: 200
      })
      expect(alias).to.equal('new')
    })

    it('ignores expired claims, unknown sources and unknown tags', () => {
      const result = resolve_account_labels({
        claims: [
          claim({ value: 'expired', expires_at: 150 }),
          claim({ source: 'gossip', value: 'rumor' }),
          claim({ label_type: 'tag', value: 'type/exchange' }),
          claim({ label_type: 'tag', value: 'type/unknown' }),
          claim({ label_type: 'tag', value: 'type/exchange', source: 'admin' })
        ],
        now: 200
      })
      expect(result).to.deep.equal({ alias: null, tags: ['type/exchange'] })
    })
  })

  describe('directory parsers', () => {
    it('maps nano.to names with their expiry', () => {
      const key = create_test_key()
      const claims = parse_nano_to([
        { name: ' Gustav ', address: key.account, expires_unix: 1849164900 },
        { name: '', address: key.account }
      ])
      expect(claims).to.deep.equal([
        {
          account: key.account,
          label_type: 'alias',
          value: 'Gustav',
          expires_at: 1849164900
        }
      ])
    })

    it('maps nanolooker categories to tags', () => {
      const [a, b] = [create_test_key(), create_test_key()]
      const claims = parse_nanolooker({
        BURN_ACCOUNT: a.account,
        KNOWN_EXCHANGE_ACCOUNTS: [b.account],
        ORIGINAL_DEVELOPER_FUND_BLOCK: 'ab'.repeat(32)
      })
      expect(claims.map((c) => [c.account, c.value])).to.deep.equal([
        [a.account, 'type/burn'],
        [b.account, 'type/exchange']
      ])
    })

    it('rejects a response of the wrong shape', () => {
      expect(() => parse_nano_to('<html>')).to.throw('expected an array')
    })
  })

  describe('sync_account_label_sources', () => {
    it('upserts claims, resolves aliases and sweeps dropped claims', async () => {
      const [a, b] = [create_test_key(), create_test_key()]
      const first = await sync({
        now: 1000,
        sources: [
          directory({
            source: 'nano.to',
            entries: [
              { name: 'Alpha', address: a.account, expires_unix: 2403579600 },
              { name: 'Beta', address: b.account },
              { name: 'Bad', address: 'nano_invalid' }
            ]
          })
        ]
      })
      expect(first[0]).to.include({ ok: true, claims: 2, rejected: 1 })
      expect((await get_account(a.account)).alias).to.equal('Alpha')
      expect((await get_account(b.account)).alias).to.equal('Beta')

      const second = await sync({
        now: 2000,
        sources: [
          directory({
            source: 'nano.to',
            entries: [{ name: 'Alpha', address: a.account }]
          })
        ]
      })
      expect(second[0], second[0].error).to.include({ ok: true, swept: 1 })
      expect((await get_account(b.account)).alias).to.equal(null)
      const changelog = await db('accounts_changelog')
        .where({ account: b.account, column: 'alias' })
        .first()
      expect(changelog).to.include({ previous_value: 'Beta', new_value: '' })
    })

    it('keeps the claims of a source whose fetch fails or comes back empty', async () => {
      const a = create_test_key()
      await sync({
        now: 1000,
        sources: [
          directory({
            source: 'nano.to',
            entries: [{ name: 'Kept', address: a.account }]
          })
        ]
      })

      const failed = await sync({
        now: 2000,
        sources: [
          directory({ source: 'nano.to', entries: new Error('HTTP 503') }),
          directory({ source: 'nano.to', entries: [] })
        ].map((source, i) => ({ ...source, url: `${source.url}/${i}` }))
      })
      expect(failed.map((result) => result.ok)).to.deep.equal([false, false])
      expect((await get_account(a.account)).alias).to.equal('Kept')
    })

    it('writes nanolooker tags to accounts_tags', async () => {
      const a = create_test_key()
      await sync({
        now: 1000,
        sources: [
          {
            ...directory({
              source: 'nanolooker',
              entries: { KNOWN_EXCHANGE_ACCOUNTS: [a.account] }
            }),
            parse: parse_nanolooker
          }
        ]
      })
      expect(await get_tags(a.account)).to.deep.equal(['type/exchange'])
    })
  })

  describe('signed messages', () => {
    it('outrank directory aliases and survive a directory sync', async () => {
      const key = create_test_key()
      const wire = sign_community_request({
        key,
        action: 'set_account_meta',
        parameters: {
          content: { alias: 'Signed Name' },
          references: [],
          tags: []
        }
      })
      const response = await chai
        .request(server)
        .post('/api/auth/message')
        .send(wire)
      expect(response).to.have.status(200)
      expect((await get_account(key.account)).alias).to.equal('Signed Name')

      await sync({
        now: Math.floor(Date.now() / 1000),
        sources: [
          directory({
            source: 'nano.to',
            entries: [{ name: 'Directory Name', address: key.account }]
          })
        ]
      })
      expect((await get_account(key.account)).alias).to.equal('Signed Name')
    })

    it('leave an existing alias alone when they carry none', async () => {
      const key = create_test_key()
      await db('account_labels').insert(
        claim({ account: key.account, source: 'admin', value: 'Admin Name' })
      )
      await materialize_account_labels({ account: key.account })
      const wire = sign_community_request({
        key,
        action: 'set_representative_meta',
        parameters: {
          content: { description: 'a node' },
          references: [],
          tags: []
        }
      })
      await chai.request(server).post('/api/auth/message').send(wire)
      expect((await get_account(key.account)).alias).to.equal('Admin Name')
    })
  })

  describe('API', () => {
    let exchange
    before(async () => {
      exchange = create_test_key()
      await db('account_labels').insert([
        claim({ account: exchange.account, value: 'Zeta Exchange' }),
        claim({
          account: exchange.account,
          label_type: 'tag',
          value: 'type/exchange'
        })
      ])
      await materialize_account_labels({ account: exchange.account })
    })
    beforeEach(() => cache.flushAll())

    it('GET /api/account-labels finds accounts by alias prefix', async () => {
      const response = await chai
        .request(server)
        .get('/api/account-labels')
        .query({ name: 'zeta ex' })
      expect(response).to.have.status(200)
      expect(response.body).to.deep.equal([
        {
          account: exchange.account,
          alias: 'Zeta Exchange',
          representative: false,
          tags: ['type/exchange']
        }
      ])
    })

    it('GET /api/account-labels treats % as a literal', async () => {
      const response = await chai
        .request(server)
        .get('/api/account-labels')
        .query({ name: '%eta' })
      expect(response.body).to.deep.equal([])
    })

    it('POST /api/account-labels/resolve labels each address', async () => {
      const unknown = create_test_key()
      const response = await chai
        .request(server)
        .post('/api/account-labels/resolve')
        .send({ addresses: [exchange.account, unknown.account] })
      expect(response).to.have.status(200)
      expect(response.body).to.deep.equal({
        [exchange.account]: { alias: 'Zeta Exchange', tags: ['type/exchange'] },
        [unknown.account]: { alias: null, tags: [] }
      })
    })

    it('POST /api/account-labels/resolve rejects an invalid address', async () => {
      const response = await chai
        .request(server)
        .post('/api/account-labels/resolve')
        .send({ addresses: ['nano_invalid'] })
      expect(response).to.have.status(400)
    })
  })
})
