/* global describe before after it */
import crypto from 'crypto'
import chai from 'chai'
import chaiHTTP from 'chai-http'
import { hash_signed_message } from 'nano-signed-message'

import server from '#api/server.mjs'
import db from '#db'
import { rpc } from '#common'
import cache from '#api/cache.mjs'
import { process_set_block_meta } from '#libs-server'
import rebuild_blocks_meta from '#root/scripts/rebuild-blocks-meta.mjs'
import hide_block_note from '#root/scripts/hide-block-note.mjs'
import { mochaGlobalSetup } from './global.mjs'
import {
  create_test_key,
  now_seconds,
  sign_community_request
} from './utils/sign-community-request.mjs'
import { stub_block_info } from './utils/stub-block-info.mjs'

process.env.NODE_ENV = 'test'
chai.use(chaiHTTP)
const expect = chai.expect

const random_hash = () => crypto.randomBytes(32).toString('hex')

const sign_note = ({ key, block_hash, note, issued_at, references }) =>
  sign_community_request({
    key,
    action: 'set_block_meta',
    issued_at,
    parameters: {
      content: { note },
      references: references || [block_hash],
      tags: []
    }
  })

const post_message = (body) =>
  chai.request(server).post('/api/auth/message').send(body)

const digest_of = (wire) =>
  Buffer.from(hash_signed_message(wire.message)).toString('hex')

const stored_message = (wire) =>
  db('nano_community_messages')
    .where({ message_digest: digest_of(wire) })
    .first()

const block_note = (block_hash) =>
  db('blocks_meta').where({ block_hash }).first()

describe('block notes', function () {
  this.timeout(10000)

  let blocks
  before(async () => {
    await mochaGlobalSetup()
    blocks = stub_block_info()
  })
  after(() => blocks.restore())

  // A confirmed block published by a fresh account
  const owned_block = () => {
    const key = create_test_key()
    const block_hash = random_hash()
    blocks.set(block_hash, { block_account: key.account })
    return { key, block_hash }
  }

  describe('POST /api/auth/message set_block_meta', () => {
    it('stores and applies the owner note', async () => {
      const { key, block_hash } = owned_block()
      const wire = sign_note({
        key,
        block_hash,
        note: '  refund for order 7\n'
      })

      const response = await post_message(wire)
      expect(response).to.have.status(200)
      expect(response.body.stored).to.equal(true)

      const row = await block_note(block_hash)
      expect(row.note).to.equal('refund for order 7')
      expect(row.account).to.equal(key.account)
      expect(row.message_digest).to.equal(digest_of(wire))
      expect(Number(row.issued_at)).to.equal(JSON.parse(wire.message).issued_at)
    })

    it('applies a note signed by a linked key for its account', async () => {
      const { key, block_hash } = owned_block()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: now_seconds()
      })

      const wire = sign_note({ key: linked_key, block_hash, note: 'via link' })
      expect(await post_message(wire)).to.have.status(200)
      expect((await block_note(block_hash)).note).to.equal('via link')
    })

    it('rejects a note signed by a revoked linked key', async () => {
      const { key, block_hash } = owned_block()
      const linked_key = create_test_key()
      await db('account_keys').insert({
        account: key.account,
        public_key: linked_key.public_key,
        link_signature: '00'.repeat(64),
        link_message: '{}',
        created_at: now_seconds(),
        revoked_at: now_seconds()
      })

      const wire = sign_note({ key: linked_key, block_hash, note: 'revoked' })
      expect(await post_message(wire)).to.have.status(400)
      expect(await stored_message(wire)).to.equal(undefined)
      expect(await block_note(block_hash)).to.equal(undefined)
    })

    const rejected = [
      [
        'a block another account published',
        ({ block_hash }) =>
          sign_note({ key: create_test_key(), block_hash, note: 'not mine' })
      ],
      [
        'an unknown block',
        ({ key }) => sign_note({ key, block_hash: random_hash(), note: 'x' })
      ],
      [
        'an unconfirmed block',
        ({ key }) => {
          const block_hash = random_hash()
          blocks.set(block_hash, {
            block_account: key.account,
            confirmed: false
          })
          return sign_note({ key, block_hash, note: 'x' })
        }
      ],
      [
        'two references',
        ({ key, block_hash }) =>
          sign_note({
            key,
            note: 'x',
            references: [block_hash, random_hash()]
          })
      ],
      [
        'an extra content key',
        ({ key, block_hash }) =>
          sign_community_request({
            key,
            action: 'set_block_meta',
            parameters: {
              content: { note: 'x', alias: 'y' },
              references: [block_hash],
              tags: []
            }
          })
      ],
      [
        'a 501-character note',
        ({ key, block_hash }) =>
          sign_note({ key, block_hash, note: 'é'.repeat(501) })
      ]
    ]
    for (const [label, build] of rejected) {
      it(`rejects ${label} and stores nothing`, async () => {
        const block = owned_block()
        const wire = build(block)
        const response = await post_message(wire)
        expect(response).to.have.status(400)
        expect(await stored_message(wire)).to.equal(undefined)
        expect(await block_note(block.block_hash)).to.equal(undefined)
      })
    }

    it('accepts a 500-character note', async () => {
      const { key, block_hash } = owned_block()
      const note = 'é'.repeat(500)
      expect(
        await post_message(sign_note({ key, block_hash, note }))
      ).to.have.status(200)
      expect((await block_note(block_hash)).note).to.equal(note)
    })

    it('returns 503 when the node cannot be reached', async () => {
      const { key, block_hash } = owned_block()
      const stubbed = rpc.blockInfo
      rpc.blockInfo = async () => null
      try {
        const wire = sign_note({ key, block_hash, note: 'x' })
        expect(await post_message(wire)).to.have.status(503)
        expect(await stored_message(wire)).to.equal(undefined)
      } finally {
        rpc.blockInfo = stubbed
      }
    })
  })

  describe('process_set_block_meta', () => {
    const apply = ({ key, block_hash, note, issued_at, message_digest }) =>
      process_set_block_meta({
        content: { note },
        references: [block_hash],
        account: key.account,
        issued_at,
        message_digest
      })

    // blocks_meta.message_digest references a stored message. These fixture
    // rows carry no signed message, so their operation keeps the rebuild from
    // replaying them, and their projection rows are removed after the suite.
    const fixture_digests = []
    after(() =>
      db('blocks_meta').whereIn('message_digest', fixture_digests).del()
    )
    const store_digest = async (key) => {
      const message_digest = random_hash()
      fixture_digests.push(message_digest)
      await db('nano_community_messages').insert({
        version: 2,
        public_key: key.public_key,
        operation: 'PROCESSOR_TEST',
        content: '{}',
        created_at: now_seconds(),
        signature: random_hash() + random_hash(),
        message_digest
      })
      return message_digest
    }

    it('keeps the newest note by issued_at, then message digest', async () => {
      const { key, block_hash } = owned_block()
      const [low, high] = [
        await store_digest(key),
        await store_digest(key)
      ].sort()

      expect(
        await apply({
          key,
          block_hash,
          note: 'b',
          issued_at: 200,
          message_digest: low
        })
      ).to.equal(true)
      expect(
        await apply({
          key,
          block_hash,
          note: 'a',
          issued_at: 100,
          message_digest: high
        })
      ).to.equal(false)
      expect((await block_note(block_hash)).note).to.equal('b')

      expect(
        await apply({
          key,
          block_hash,
          note: 'c',
          issued_at: 200,
          message_digest: high
        })
      ).to.equal(true)
      expect(
        await apply({
          key,
          block_hash,
          note: 'd',
          issued_at: 200,
          message_digest: low
        })
      ).to.equal(false)
      expect((await block_note(block_hash)).note).to.equal('c')
    })

    it('clears with an empty note and keeps the row, so an older note cannot revive it', async () => {
      const { key, block_hash } = owned_block()
      await apply({
        key,
        block_hash,
        note: 'first',
        issued_at: 100,
        message_digest: await store_digest(key)
      })
      await apply({
        key,
        block_hash,
        note: '',
        issued_at: 300,
        message_digest: await store_digest(key)
      })
      expect(
        await apply({
          key,
          block_hash,
          note: 'late',
          issued_at: 200,
          message_digest: await store_digest(key)
        })
      ).to.equal(false)
      expect((await block_note(block_hash)).note).to.equal('')
    })

    it('keeps the hide columns when a note is cleared', async () => {
      const { key, block_hash } = owned_block()
      await apply({
        key,
        block_hash,
        note: 'first',
        issued_at: 100,
        message_digest: await store_digest(key)
      })
      await db('blocks_meta')
        .where({ block_hash })
        .update({ hidden_at: 1, hidden_reason: 'spam' })
      await apply({
        key,
        block_hash,
        note: '',
        issued_at: 200,
        message_digest: await store_digest(key)
      })
      const row = await block_note(block_hash)
      expect(row.note).to.equal('')
      expect(row.hidden_reason).to.equal('spam')
    })

    it('strips control characters other than newline', async () => {
      const { key, block_hash } = owned_block()
      await apply({
        key,
        block_hash,
        note: 'a\u0007b\nc\u0000',
        issued_at: 100,
        message_digest: await store_digest(key)
      })
      expect((await block_note(block_hash)).note).to.equal('ab\nc')
    })
  })

  describe('GET /api/blocks/:hash', () => {
    let original_blocks_info
    before(() => {
      original_blocks_info = rpc.blocksInfo
      rpc.blocksInfo = async ({ hashes }) => ({
        blocks: {
          [hashes[0]]: {
            block_account:
              'nano_1111111111111111111111111111111111111111111111111111hifc8npp',
            source_account: '0',
            contents: {
              type: 'state',
              link_as_account:
                'nano_1111111111111111111111111111111111111111111111111111hifc8npp'
            }
          }
        }
      })
    })
    after(() => {
      rpc.blocksInfo = original_blocks_info
    })

    const get_block = (hash) => chai.request(server).get(`/api/blocks/${hash}`)

    it('returns the note, and a new note at once despite the response cache', async () => {
      const { key, block_hash } = owned_block()
      expect(
        (await get_block(block_hash.toUpperCase())).body.blockNote
      ).to.equal(null)

      const wire = sign_note({ key, block_hash, note: 'cold-wallet sweep' })
      expect(await post_message(wire)).to.have.status(200)

      const response = await get_block(block_hash.toUpperCase())
      expect(response.body.blockNote).to.deep.equal({
        note: 'cold-wallet sweep',
        account: key.account,
        issued_at: JSON.parse(wire.message).issued_at
      })
    })

    it('returns null for a cleared note', async () => {
      const { key, block_hash } = owned_block()
      await post_message(
        sign_note({ key, block_hash, note: 'x', issued_at: now_seconds() - 10 })
      )
      await post_message(sign_note({ key, block_hash, note: '' }))
      expect((await get_block(block_hash)).body.blockNote).to.equal(null)
    })

    it('stops and resumes returning a hidden note', async () => {
      const { key, block_hash } = owned_block()
      await post_message(sign_note({ key, block_hash, note: 'visible' }))

      // the hide script runs in its own process, so the API's 30-second
      // response cache is cleared here to stand in for its expiry
      expect(await hide_block_note({ block_hash, reason: 'spam' })).to.equal(
        true
      )
      cache.del(`/block/${block_hash}`)
      expect((await get_block(block_hash)).body.blockNote).to.equal(null)

      expect(await hide_block_note({ block_hash, unhide: true })).to.equal(true)
      cache.del(`/block/${block_hash}`)
      expect((await get_block(block_hash)).body.blockNote.note).to.equal(
        'visible'
      )
    })
  })

  describe('rebuild-blocks-meta', () => {
    it('reproduces the table from the message log, hide columns included', async () => {
      const a = owned_block()
      const b = owned_block()
      const t = now_seconds()
      for (const wire of [
        sign_note({ ...a, note: 'a1', issued_at: t - 20 }),
        sign_note({ ...a, note: 'a2', issued_at: t - 10 }),
        sign_note({ ...b, note: 'b1', issued_at: t - 5 })
      ]) {
        expect(await post_message(wire)).to.have.status(200)
      }
      await hide_block_note({ block_hash: b.block_hash, reason: 'spam' })

      const before = await db('blocks_meta').orderBy('block_hash')
      const dry = await rebuild_blocks_meta({ dry_run: true })
      expect(dry.changed).to.equal(0)
      expect(dry.rejected).to.equal(0)
      expect(dry.hides_dropped).to.equal(0)

      // corrupt the projection, then rebuild it
      await db('blocks_meta')
        .where({ block_hash: a.block_hash })
        .update({ note: 'wrong' })
      const counts = await rebuild_blocks_meta()
      expect(counts.changed).to.equal(1)
      const without_updated_at = (rows) =>
        rows.map(({ updated_at, ...row }) => row)
      expect(
        without_updated_at(await db('blocks_meta').orderBy('block_hash'))
      ).to.deep.equal(without_updated_at(before))
    })
  })
})
