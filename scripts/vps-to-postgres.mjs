// vps-to-postgres.mjs
//
// One-shot bulk migration from VPS-local MySQL `nano_production` to the
// co-located PG/Timescale `nano_production` database on the VPS. Both
// source and sink are 127.0.0.1; no tunnel in the hot path.
//
// Structurally a sibling of scripts/archive-to-postgres.mjs (bulk path).
// Differences: reads config.mysql (not config.storage_mysql); writes to
// config.production_postgres; iterates all 29 source tables in size-
// ascending RUN_ORDER; no telemetry-index account-backfill (VPS data has
// `account` populated on live writes); special-cases representatives_
// uptime_index dedup because the PG schema tightens UNIQUE(account,
// online) -> UNIQUE(account).
//
// pg.Client used directly (not Knex) because COPY needs a single
// dedicated connection from BEGIN through COMMIT.
//
// decimalNumbers: false override on mysql2 so numeric(39,0) (weight,
// balance) arrives as JS strings and survives into PG with full precision.
//
// See:
//   user:task/homelab/migrate-nano-community-vps-database.md
//   user:text/homelab/nano-community-database-architecture-decision.md

import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import debug from 'debug'
import mysql from 'mysql2/promise'
import pg from 'pg'
import pgCopyStreams from 'pg-copy-streams'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import config from '#config'

const logger = debug('vps-to-pg')
debug.enable('vps-to-pg')

// Size-ascending: smallest first so transform/escape bugs surface cheaply.
// Hot tables (telemetry, accounts_meta, uptime) trail. Exact ordering is
// best-effort; the script tolerates a different order via --resume-from.
const RUN_ORDER = [
  'voting_weight',
  'sources',
  'accounts_tags',
  'users',
  'accounts_changelog',
  'representatives_meta_index_changelog',
  'accounts_delegators',
  'account_keys',
  'accounts',
  'accounts_meta_index',
  'representatives_meta_index',
  'representatives_network_index',
  'representatives_network',
  'github_events',
  'github_issues',
  'github_issue_labels',
  'github_discussions',
  'github_discussion_labels',
  'nano_community_messages',
  'representatives_uptime_summary',
  'representatives_uptime_rollup_day',
  'representatives_uptime_rollup_hour',
  'representatives_uptime_index',
  'post_labels',
  'posts',
  'representatives_telemetry_index',
  'representatives_telemetry',
  'accounts_meta',
  'representatives_uptime'
]

// Ordinal column lists transcribed from db/schema.postgres.sql (and the
// matching db/schema.mysql.sql source). Quoted columns ("column",
// "interval", "references", "countryCode", etc.) are still listed
// bare here; quoting is applied at SELECT/COPY time.
const TABLE_COLUMNS = {
  accounts: ['account', 'alias', 'monitor_url', 'watt_hour', 'representative', 'last_seen'],
  accounts_changelog: ['account', 'column', 'previous_value', 'new_value', 'timestamp'],
  account_keys: ['account', 'public_key', 'link_signature', 'revoke_signature', 'created_at', 'revoked_at'],
  accounts_delegators: ['account', 'representative', 'balance', 'timestamp'],
  accounts_meta: ['account', 'balance', 'block_count', 'weight', 'delegators', 'timestamp'],
  accounts_meta_index: ['account', 'balance', 'block_count', 'weight', 'delegators', 'timestamp'],
  accounts_tags: ['account', 'tag'],
  github_discussions: [
    'id', 'author_id', 'author_name', 'author_avatar', 'ref', 'title', 'url', 'repo',
    'body', 'upvotes', 'category_name', 'closed', 'state_reason', 'category_id',
    'created_at', 'updated_at', 'closed_at'
  ],
  github_discussion_labels: ['discussion_id', 'label_id', 'label_name', 'label_color'],
  github_events: [
    'id', 'type', 'actor_id', 'actor_name', 'actor_avatar', 'action', 'ref', 'title',
    'body', 'event_url', 'created_at'
  ],
  github_issues: [
    'id', 'state', 'actor_id', 'actor_name', 'actor_avatar', 'assignee_id',
    'assignee_name', 'assignee_avatar', 'ref', 'title', 'url', 'repo', 'body',
    'created_at', 'updated_at'
  ],
  github_issue_labels: ['issue_id', 'label_id', 'label_name', 'label_color'],
  nano_community_messages: [
    'version', 'entry_id', 'chain_id', 'entry_clock', 'chain_clock', 'public_key',
    'operation', 'content', 'tags', 'references', 'created_at', 'signature'
  ],
  posts: [
    'id', 'pid', 'sid', 'title', 'url', 'content_url', 'author', 'authorid', 'text',
    'html', 'summary', 'score', 'social_score', 'created_at', 'updated_at'
  ],
  post_labels: ['post_id', 'label', 'account_id'],
  representatives_meta_index: [
    'account', 'cpu_cores', 'cpu_description', 'cpu_model', 'bandwidth_description',
    'ram', 'ram_description', 'donation_address', 'description', 'dedicated', 'type',
    'provider', 'created_at', 'mynano_ninja', 'ninja_ram_description',
    'ninja_cpu_description', 'ninja_description', 'ninja_type', 'ninja_created_at',
    'ninja_provider', 'reddit', 'twitter', 'discord', 'github', 'website', 'email',
    'nano_node_monitor_url', 'timestamp'
  ],
  representatives_meta_index_changelog: ['account', 'column', 'previous_value', 'new_value', 'timestamp'],
  representatives_telemetry: [
    'account', 'weight', 'block_count', 'block_behind', 'cemented_count',
    'cemented_behind', 'account_count', 'unchecked_count', 'bandwidth_cap',
    'peer_count', 'protocol_version', 'uptime', 'major_version', 'minor_version',
    'patch_version', 'pre_release_version', 'maker', 'node_id', 'address', 'port',
    'telemetry_timestamp', 'timestamp'
  ],
  representatives_telemetry_index: [
    'account', 'weight', 'block_count', 'block_behind', 'cemented_count',
    'cemented_behind', 'account_count', 'unchecked_count', 'bandwidth_cap',
    'peer_count', 'protocol_version', 'uptime', 'major_version', 'minor_version',
    'patch_version', 'pre_release_version', 'maker', 'node_id', 'address', 'port',
    'telemetry_timestamp', 'timestamp'
  ],
  representatives_network: [
    'account', 'address', 'continent', 'country', 'countryCode', 'region',
    'regionName', 'city', 'zip', 'lat', 'lon', 'timezone', 'isp', 'org', 'as',
    'asname', 'hosted', 'timestamp'
  ],
  representatives_network_index: [
    'account', 'address', 'continent', 'country', 'countryCode', 'region',
    'regionName', 'city', 'zip', 'lat', 'lon', 'timezone', 'isp', 'org', 'as',
    'asname', 'hosted', 'timestamp'
  ],
  representatives_uptime: ['account', 'online', 'timestamp'],
  representatives_uptime_index: ['account', 'online', 'timestamp'],
  representatives_uptime_summary: ['account', 'days', 'online_count', 'offline_count'],
  representatives_uptime_rollup_hour: ['account', 'online', 'interval'],
  representatives_uptime_rollup_day: [
    'account', 'online_count', 'offline_count', 'longest_downtime', 'timestamp'
  ],
  sources: ['id', 'title', 'logo_url', 'score_avg', 'social_score_avg', 'created_at', 'updated_at'],
  users: ['id', 'username', 'public_key', 'signature', 'last_visit'],
  voting_weight: [
    'address', 'quorum_delta', 'online_weight_quorum_percent', 'online_weight_minimum',
    'online_stake_total', 'trended_stake_total', 'peers_stake_total', 'timestamp'
  ]
}

// Tables whose PG schema uses GENERATED BY DEFAULT AS IDENTITY. After load
// we setval() the sequence so post-cutover inserts from the app don't
// collide with copied ids.
const IDENTITY_TABLES = ['posts', 'users']

// PG TEXT format escapes. NUL byte stripped (PG rejects 0x00 in text).
let _nul_strip_count = 0
function pgEscape(v) {
  if (v === null || v === undefined) return '\\N'
  if (typeof v === 'boolean') return v ? 't' : 'f'
  if (typeof v === 'number') return String(v)
  if (Buffer.isBuffer(v)) v = v.toString('utf8')
  let s = String(v)
  if (s.indexOf('\u0000') >= 0) {
    _nul_strip_count++
    s = s.split('\u0000').join('')
  }
  if (s.indexOf('\\') >= 0) s = s.replace(/\\/g, '\\\\')
  if (s.indexOf('\n') >= 0) s = s.replace(/\n/g, '\\n')
  if (s.indexOf('\r') >= 0) s = s.replace(/\r/g, '\\r')
  if (s.indexOf('\t') >= 0) s = s.replace(/\t/g, '\\t')
  return s
}

function rowToTsv(row, cols) {
  const parts = new Array(cols.length)
  for (let i = 0; i < cols.length; i++) parts[i] = pgEscape(row[cols[i]])
  return parts.join('\t') + '\n'
}

async function openMysqlReader() {
  const base = config.mysql.connection
  return mysql.createConnection({ ...base, decimalNumbers: false })
}

async function openPgWriter() {
  const client = new pg.Client(config.production_postgres.connection)
  await client.connect()
  return client
}

async function runTable(table, mysqlConn, pgClient, opts) {
  const cols = TABLE_COLUMNS[table]
  if (!cols) throw new Error(`unknown table: ${table}`)
  const pgColList = cols.map((c) => `"${c}"`).join(',')
  const mysqlColList = cols.map((c) => '`' + c + '`').join(',')

  logger(`${table}: starting (dry_run=${!!opts.dryRun})`)
  const t0 = Date.now()

  let rowsExtracted = 0
  let rowsInserted = 0
  let liveBefore = 0
  let liveAfter = 0
  let committed = false

  await pgClient.query('BEGIN')
  try {
    await pgClient.query(
      `INSERT INTO public.etl_state (table_name, started_at, completed_at, notes)
       VALUES ($1, NOW(), NULL, NULL)
       ON CONFLICT (table_name) DO UPDATE
         SET started_at = EXCLUDED.started_at, completed_at = NULL, notes = NULL`,
      [table]
    )

    await pgClient.query(
      `CREATE TEMP TABLE _stage (LIKE public."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`
    )

    const copySql = `COPY _stage (${pgColList}) FROM STDIN WITH (FORMAT text)`
    const copyStream = pgClient.query(pgCopyStreams.from(copySql))

    const mysqlStream = mysqlConn.connection
      .query('SELECT ' + mysqlColList + ' FROM `' + table + '`')
      .stream({ highWaterMark: 50000 })

    let rowsRead = 0
    let lastLogged = 0
    const transform = new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      transform(row, _enc, cb) {
        rowsRead++
        if (rowsRead - lastLogged >= 1_000_000) {
          const elapsed = (Date.now() - t0) / 1000
          logger(
            `${table}: ${rowsRead.toLocaleString()} rows streamed ` +
            `@ ${Math.round(rowsRead / elapsed).toLocaleString()} rows/s`
          )
          lastLogged = rowsRead
        }
        cb(null, rowToTsv(row, cols))
      }
    })

    await pipeline(mysqlStream, transform, copyStream)
    logger(`${table}: COPY done -- ${rowsRead.toLocaleString()} rows into _stage in ${Date.now() - t0}ms`)

    const { rows: extractedRows } = await pgClient.query('SELECT count(*)::bigint AS c FROM _stage')
    rowsExtracted = Number(extractedRows[0].c)

    if (opts.dryRun) {
      logger(`${table}: --dry-run -- ROLLBACK (skip INSERT into public."${table}")`)
      await pgClient.query('ROLLBACK')
      committed = true
    } else {
      const before = await pgClient.query(`SELECT count(*)::bigint AS c FROM public."${table}"`)
      liveBefore = Number(before.rows[0].c)
      logger(`${table}: INSERT _stage -> public."${table}" (live_before=${liveBefore.toLocaleString()})`)

      // representatives_uptime_index: PG schema tightens UNIQUE to (account)
      // alone. MySQL had UNIQUE(account, online) and may contain two rows
      // per account. Keep the row with the latest timestamp per account.
      if (table === 'representatives_uptime_index') {
        await pgClient.query(
          `INSERT INTO public."${table}" (${pgColList})
           SELECT DISTINCT ON (account) ${pgColList}
           FROM _stage
           ORDER BY account, "timestamp" DESC
           ON CONFLICT DO NOTHING`
        )
      } else {
        await pgClient.query(
          `INSERT INTO public."${table}" (${pgColList})
           SELECT ${pgColList} FROM _stage
           ON CONFLICT DO NOTHING`
        )
      }

      const after = await pgClient.query(`SELECT count(*)::bigint AS c FROM public."${table}"`)
      liveAfter = Number(after.rows[0].c)
      rowsInserted = liveAfter - liveBefore

      // Sync IDENTITY sequence so post-cutover inserts don't collide.
      if (IDENTITY_TABLES.includes(table)) {
        await pgClient.query(
          `SELECT setval(pg_get_serial_sequence('public.${table}', 'id'),
                         COALESCE((SELECT MAX(id) FROM public."${table}"), 1))`
        )
        logger(`${table}: setval(id sequence) to MAX(id)`)
      }

      await pgClient.query(
        `UPDATE public.etl_state
           SET rows_extracted = $2, rows_inserted = $3, completed_at = NOW(),
               notes = $4
         WHERE table_name = $1`,
        [
          table, rowsExtracted, rowsInserted,
          `live_before=${liveBefore} live_after=${liveAfter}`
        ]
      )
      await pgClient.query('COMMIT')
      committed = true
    }
  } catch (err) {
    if (!committed) {
      try { await pgClient.query('ROLLBACK') } catch { /* ignore */ }
    }
    throw err
  }

  const tookMs = Date.now() - t0
  const rate = Math.round(rowsExtracted / (tookMs / 1000)) || 0
  logger(
    `${table}: extracted=${rowsExtracted.toLocaleString()} ` +
    `inserted=${rowsInserted.toLocaleString()} ` +
    `live_before=${liveBefore.toLocaleString()} live_after=${liveAfter.toLocaleString()} ` +
    `took=${tookMs}ms rate=${rate.toLocaleString()}rows/s`
  )

  return {
    table,
    rows_extracted: rowsExtracted,
    rows_inserted: rowsInserted,
    live_before: liveBefore,
    live_after: liveAfter,
    took_ms: tookMs,
    rate_rows_per_s: rate,
    dry_run: !!opts.dryRun
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv)).argv
  const opts = {
    onlyTable: argv.onlyTable || null,
    dryRun: !!argv.dryRun,
    resumeFrom: argv.resumeFrom || null
  }

  let order = RUN_ORDER.slice()
  if (opts.onlyTable) {
    if (!RUN_ORDER.includes(opts.onlyTable)) {
      throw new Error(`--only-table=${opts.onlyTable} is not in RUN_ORDER`)
    }
    order = [opts.onlyTable]
  } else if (opts.resumeFrom) {
    const i = RUN_ORDER.indexOf(opts.resumeFrom)
    if (i < 0) throw new Error(`--resume-from=${opts.resumeFrom} is not in RUN_ORDER`)
    order = RUN_ORDER.slice(i)
  }

  logger(`vps-to-postgres starting: order=[${order.join(', ')}] dry_run=${opts.dryRun}`)
  const tStart = Date.now()

  const mysqlConn = await openMysqlReader()
  const pgClient = await openPgWriter()
  const summaries = []
  let failed = null
  try {
    for (const table of order) {
      try {
        summaries.push(await runTable(table, mysqlConn, pgClient, opts))
      } catch (err) {
        logger(`${table}: FAILED -- ${err.message}`)
        console.error(err)
        failed = { table, error: err.message }
        break
      }
    }
  } finally {
    try { await pgClient.end() } catch { /* ignore */ }
    try { await mysqlConn.end() } catch { /* ignore */ }
  }

  const tookMs = Date.now() - tStart
  logger(`vps-to-postgres done in ${tookMs}ms (nul_strip_count=${_nul_strip_count})`)
  for (const s of summaries) {
    logger(
      `  ${s.table}: extracted=${s.rows_extracted.toLocaleString()} ` +
      `inserted=${s.rows_inserted.toLocaleString()} took=${s.took_ms}ms ` +
      `rate=${s.rate_rows_per_s.toLocaleString()}rows/s` +
      (s.dry_run ? ' [dry-run]' : '')
    )
  }

  if (failed) {
    logger(`FAILURE on table=${failed.table}: ${failed.error}`)
    process.exitCode = 1
  }
}

if (isMain(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
