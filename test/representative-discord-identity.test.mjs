/* global describe before beforeEach it */
import chai from 'chai'

import db from '#db'
import update_representative_meta from '#libs-server/update-representative-meta.mjs'
import { save_discord_posts } from '#root/scripts/import-discord.mjs'
import { sync_representative_discord_identity } from '#root/scripts/sync-representative-discord-identity.mjs'
import { mochaGlobalSetup } from './global.mjs'

process.env.NODE_ENV = 'test'
const expect = chai.expect

const guild_id = '370266023905198083'
let message_sequence = 0

const discord_post = ({ author, authorid, created_at, text = 'gm' }) => {
  message_sequence += 1
  const message_id = `${1000 + message_sequence}`
  return {
    pid: `discord:1:${message_id}`,
    sid: `discord:${guild_id}`,
    title: null,
    url: `https://discord.com/channels/${guild_id}/1/${message_id}`,
    author,
    authorid,
    created_at: new Date(created_at * 1000),
    updated_at: null,
    html: null,
    text,
    score: 1
  }
}

const add_representative = (account, fields) =>
  db('representatives_meta_index').insert({
    account,
    timestamp: 1,
    ...fields
  })

const get_representative = (account) =>
  db('representatives_meta_index').where({ account }).first()

const get_changelog = (account, column) =>
  db('representatives_meta_index_changelog')
    .where({ account, column })
    .orderBy('timestamp')

describe('Representative Discord identity', () => {
  before(mochaGlobalSetup)

  beforeEach(async () => {
    await db('posts').where('sid', 'like', 'discord:%').del()
    await db('representatives_meta_index_changelog').del()
    await db('representatives_meta_index').del()
  })

  describe('update_representative_meta', () => {
    it('stores a discord_user_id and logs a change to it', async () => {
      const account = 'nano_discord_update'
      await add_representative(account, {})

      await update_representative_meta({
        representative_account_address: account,
        update: { discord_user_id: '111' }
      })
      expect((await get_representative(account)).discord_user_id).to.equal(
        '111'
      )

      await update_representative_meta({
        representative_account_address: account,
        update: { discord_user_id: '222' }
      })
      const changelog = await get_changelog(account, 'discord_user_id')
      expect(changelog).to.have.length(1)
      expect(changelog[0].previous_value).to.equal('111')
      expect(changelog[0].new_value).to.equal('222')
    })
  })

  describe('save_discord_posts', () => {
    it('keeps the first-seen author name when a message is re-fetched', async () => {
      const post = discord_post({
        author: 'oldname',
        authorid: '111',
        created_at: 100
      })
      await save_discord_posts([post])
      await save_discord_posts([
        {
          ...post,
          author: 'newname',
          text: 'edited',
          updated_at: new Date(200 * 1000)
        }
      ])

      const row = await db('posts').where({ url: post.url }).first()
      expect(row.author).to.equal('oldname')
      expect(row.text).to.equal('edited')
      expect(row.updated_at.getTime()).to.equal(200 * 1000)
    })
  })

  describe('sync_representative_discord_identity', () => {
    it('resolves the id for a handle matching exactly one author', async () => {
      await add_representative('nano_unique', { discord: 'alice' })
      await save_discord_posts([
        discord_post({ author: 'alice', authorid: '111', created_at: 100 })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.resolved_count).to.equal(1)
      expect(counts.renamed_count).to.equal(0)
      expect(
        (await get_representative('nano_unique')).discord_user_id
      ).to.equal('111')
    })

    it('leaves a handle matching two authors unresolved', async () => {
      await add_representative('nano_ambiguous', { discord: 'bob' })
      await save_discord_posts([
        discord_post({ author: 'bob', authorid: '111', created_at: 100 }),
        discord_post({ author: 'Bob', authorid: '222', created_at: 100 })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.resolved_count).to.equal(0)
      expect(counts.unmatched_count).to.equal(1)
      expect(
        (await get_representative('nano_ambiguous')).discord_user_id
      ).to.equal(null)
    })

    it('renames a representative to the newest name of their id', async () => {
      await add_representative('nano_renamed', {
        discord: 'carol',
        discord_user_id: '333'
      })
      await save_discord_posts([
        discord_post({ author: 'carol', authorid: '333', created_at: 100 }),
        discord_post({ author: 'carol_new', authorid: '333', created_at: 200 })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.renamed_count).to.equal(1)
      expect((await get_representative('nano_renamed')).discord).to.equal(
        'carol_new'
      )
      const changelog = await get_changelog('nano_renamed', 'discord')
      expect(changelog).to.have.length(1)
      expect(changelog[0].previous_value).to.equal('carol')
      expect(changelog[0].new_value).to.equal('carol_new')
    })

    it('keeps a self-reported handle the id has never posted under', async () => {
      await add_representative('nano_claim', {
        discord: 'dave',
        discord_user_id: '444'
      })
      await save_discord_posts([
        discord_post({
          author: 'someone_else',
          authorid: '444',
          created_at: 100
        })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.claim_mismatch_count).to.equal(1)
      expect(counts.renamed_count).to.equal(0)
      expect((await get_representative('nano_claim')).discord).to.equal('dave')
    })

    it('matches a discriminator handle and replaces it with the current name', async () => {
      await add_representative('nano_discriminator', { discord: 'Erin#1234' })
      await save_discord_posts([
        discord_post({ author: 'erin', authorid: '555', created_at: 100 })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.resolved_count).to.equal(1)
      expect(counts.renamed_count).to.equal(1)
      const representative = await get_representative('nano_discriminator')
      expect(representative.discord_user_id).to.equal('555')
      expect(representative.discord).to.equal('erin')
    })

    it('fills the username for an id reported without one', async () => {
      await add_representative('nano_id_only', { discord_user_id: '666' })
      await save_discord_posts([
        discord_post({ author: 'frank', authorid: '666', created_at: 100 })
      ])

      const counts = await sync_representative_discord_identity()

      expect(counts.renamed_count).to.equal(1)
      expect(counts.claim_mismatch_count).to.equal(0)
      expect((await get_representative('nano_id_only')).discord).to.equal(
        'frank'
      )
    })
  })
})
