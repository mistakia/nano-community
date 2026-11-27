/* global describe before after it */
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import chai from 'chai'

import config from '#config'
import knex from '#db'
import {
  DELTA_RUN_ORDER,
  build_vps_delta_query,
  create_archive_writer,
  create_vps_reader,
  runTableDelta
} from '#root/scripts/archive-to-postgres.mjs'
import { mochaGlobalSetup } from './global.mjs'

const expect = chai.expect
const __dirname = dirname(fileURLToPath(import.meta.url))
const ARCHIVE_DATABASE = 'nano_test_archive'
const ACCOUNT = `nano_3${'7'.repeat(59)}`

// Instants as UTC text, the form the archive must reproduce exactly.
const instants_text = async (client, sql) =>
  (await client.query(sql)).rows.map((row) => Object.values(row).join('|'))

describe('archive delta copies VPS instants as timestamptz', function () {
  this.timeout(60000)
  let vps
  let archive

  before(async () => {
    await mochaGlobalSetup()
    await knex.raw(`DROP DATABASE IF EXISTS ${ARCHIVE_DATABASE}`)
    await knex.raw(`CREATE DATABASE ${ARCHIVE_DATABASE}`)

    const connection = config.production_postgres.connection
    vps = create_vps_reader(connection)
    await vps.connect()
    archive = create_archive_writer({
      ...connection,
      database: ARCHIVE_DATABASE
    })
    await archive.connect()
    const schema = await fs.readFile(
      path.resolve(__dirname, '../db/schema.archive.postgres.sql'),
      'utf8'
    )
    await archive.query(schema)

    await knex('representatives_uptime').where({ account: ACCOUNT }).del()
    await knex('representatives_telemetry').where({ account: ACCOUNT }).del()
    await knex('posts')
      .where('url', 'like', 'https://archive-delta-test/%')
      .del()
    await knex.raw(
      `INSERT INTO representatives_uptime (account, online, observed_at) VALUES
       (?, 1, '2026-11-26 15:10:00.123456+00'), (?, 0, '2026-11-26 15:15:00.5+00')`,
      [ACCOUNT, ACCOUNT]
    )
    await knex.raw(
      `INSERT INTO representatives_telemetry (account, weight, block_count, block_behind,
         cemented_count, cemented_behind, account_count, unchecked_count, bandwidth_cap,
         peer_count, protocol_version, uptime, major_version, minor_version, patch_version,
         pre_release_version, maker, node_id, address, port, reported_at, observed_at)
       VALUES (?, 123456789012345678901234567890123456789, 1, 2, 3, 4, 5, 6, 7, 8, 21, 9,
         27, 1, 0, '', '0', 'node_archive_delta', '::1', 7075,
         '2026-11-26 15:09:59.999999+00', '2026-11-26 15:10:00.000001+00')`,
      [ACCOUNT]
    )
    await knex.raw(
      `INSERT INTO posts (pid, sid, title, url, author, text, score, social_score, created_at, updated_at)
       VALUES ('archive-delta-1', 'reddit', 'tab\there', 'https://archive-delta-test/1', 'author',
         E'line\\nbreak', 1.0, 3.7, '2026-11-26 23:42:10.684+00', NULL)`
    )
    await knex.raw(
      `INSERT INTO network_events (network_event_id, network_event_type, network_event_phase,
         severity, representative_account, evidence, observed_at)
       VALUES ('archive-delta-event', 'representative_offline', 'began', 'warning', ?,
         '{"began_at": "2026-11-26T15:10:00.25Z", "note": "tab\\there"}', '2026-11-26 15:10:00.25+00')`,
      [ACCOUNT]
    )
    await knex.raw(
      `INSERT INTO network_event_coverage (producer, coverage_began_at, coverage_ended_at)
       VALUES ('telemetry_detector', '2026-11-26 15:05:00.000001+00', '2026-11-26 15:10:00.999999+00')`
    )
  })

  after(async () => {
    await knex('network_events')
      .where({ network_event_id: 'archive-delta-event' })
      .del()
    await knex('network_event_coverage')
      .where({ producer: 'telemetry_detector' })
      .del()
    await archive?.end()
    await vps?.end()
    await knex.raw(`DROP DATABASE IF EXISTS ${ARCHIVE_DATABASE} WITH (FORCE)`)
  })

  it('compares each watermark against its typed column', () => {
    expect(build_vps_delta_query('representatives_uptime')).to.contain(
      'WHERE "observed_at" > COALESCE($1::timestamptz, \'-infinity\'::timestamptz)'
    )
    expect(build_vps_delta_query('network_events')).to.contain(
      'WHERE "network_event_sequence" > COALESCE($1::bigint, 0)'
    )
  })

  it('copies every row with its sub-second instants, then advances the watermark', async () => {
    for (const table of DELTA_RUN_ORDER) {
      await runTableDelta(table, vps, archive)
    }

    const uptime_sql = `SELECT account, online, observed_at::text AS observed_at
      FROM public.representatives_uptime ORDER BY account, observed_at`
    expect(await instants_text(archive, uptime_sql)).to.deep.equal(
      await instants_text(vps, uptime_sql)
    )
    expect(
      await instants_text(
        archive,
        `SELECT observed_at::text FROM public.representatives_uptime WHERE account = '${ACCOUNT}' ORDER BY 1`
      )
    ).to.deep.equal([
      '2026-11-26 15:10:00.123456+00',
      '2026-11-26 15:15:00.5+00'
    ])

    const telemetry_sql = `SELECT account, node_id, weight::text, reported_at::text, observed_at::text
      FROM public.representatives_telemetry ORDER BY node_id, observed_at`
    expect(await instants_text(archive, telemetry_sql)).to.deep.equal(
      await instants_text(vps, telemetry_sql)
    )

    const post = await archive.query(
      `SELECT title, text, social_score, created_at::text AS created_at, updated_at
       FROM public.posts WHERE url = 'https://archive-delta-test/1'`
    )
    expect(post.rows).to.deep.equal([
      {
        title: 'tab\there',
        text: 'line\nbreak',
        social_score: 3,
        created_at: '2026-11-26 23:42:10.684+00',
        updated_at: null
      }
    ])

    const events_sql = `SELECT network_event_sequence, network_event_id, evidence::text,
        observed_at::text, recorded_at::text FROM public.network_events ORDER BY 1`
    expect(await instants_text(archive, events_sql)).to.deep.equal(
      await instants_text(vps, events_sql)
    )
    const coverage_sql = `SELECT network_event_coverage_sequence, coverage_began_at::text,
        coverage_ended_at::text, recorded_at::text FROM public.network_event_coverage ORDER BY 1`
    const coverage = await instants_text(archive, coverage_sql)
    expect(coverage).to.have.length.above(0)
    expect(coverage).to.deep.equal(await instants_text(vps, coverage_sql))

    const state = await archive.query(
      `SELECT table_name, watermark_at::text AS watermark_at, watermark_sequence
       FROM public.etl_state WHERE table_name = 'representatives_uptime'`
    )
    const vps_max = await vps.query(
      'SELECT max(observed_at)::text AS m FROM public.representatives_uptime'
    )
    expect(state.rows[0].watermark_at).to.equal(vps_max.rows[0].m)
    expect(state.rows[0].watermark_sequence).to.equal(null)

    const sequence_state = await archive.query(
      `SELECT watermark_at, watermark_sequence::text AS watermark_sequence
       FROM public.etl_state WHERE table_name = 'network_event_coverage'`
    )
    const vps_sequence = await vps.query(
      'SELECT max(network_event_coverage_sequence)::text AS m FROM public.network_event_coverage'
    )
    expect(sequence_state.rows[0]).to.deep.equal({
      watermark_at: null,
      watermark_sequence: vps_sequence.rows[0].m
    })
  })

  it('reads nothing again on the next run, and picks up a later row', async () => {
    const again = await runTableDelta('representatives_uptime', vps, archive)
    expect(again.rows_extracted).to.equal(0)

    await knex.raw(
      `INSERT INTO representatives_uptime (account, online, observed_at)
       VALUES (?, 1, (SELECT max(observed_at) + interval '1 microsecond' FROM representatives_uptime))`,
      [ACCOUNT]
    )
    const later = await runTableDelta('representatives_uptime', vps, archive)
    expect(later.rows_extracted).to.equal(1)
    expect(later.rows_inserted).to.equal(1)
    const vps_max = await vps.query(
      'SELECT max(observed_at)::text AS m FROM public.representatives_uptime'
    )
    expect(later.watermark_after).to.equal(vps_max.rows[0].m)
  })
})
