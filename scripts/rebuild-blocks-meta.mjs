import debug from 'debug'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import db from '#db'
import { isMain } from '#common'
import { process_set_block_meta } from '#libs-server'
import {
  CommunityRequestError,
  COMMUNITY_WINDOW_SECONDS
} from '#libs-server/verify-community-request.mjs'

const log = debug('rebuild-blocks-meta')
debug.enable('rebuild-blocks-meta')

// The account a key acted for when it signed: a link in force at issued_at,
// otherwise the key's own account. A link counts from COMMUNITY_WINDOW_SECONDS
// before its server-time created_at, since issued_at is signer time.
const resolve_account = async ({ connection, public_key, payload }) => {
  const link = await connection('account_keys')
    .select('account')
    .where({ public_key })
    .where('created_at', '<=', payload.issued_at + COMMUNITY_WINDOW_SECONDS)
    .where((query) =>
      query
        .whereNull('revoked_at')
        .orWhere('revoked_at', '>', payload.issued_at)
    )
    .first()
  return link ? link.account : payload.account
}

const note_key = (row) => `${row.note}\u0000${row.message_digest}`

// Rebuilds blocks_meta from the version 2 set_block_meta messages in
// nano_community_messages. Version 1 messages bind no content and are skipped.
// The hide columns are moderation state, so they are carried over; a hide on a
// block that no longer has a note row is dropped and counted.
export default async function rebuild_blocks_meta({
  dry_run = false,
  get_block_account
} = {}) {
  const trx = await db.transaction()
  const counts = {
    messages: 0,
    applied: 0,
    superseded: 0,
    rejected: 0,
    hides_dropped: 0,
    changed: 0
  }
  try {
    const previous = await trx('blocks_meta').select()
    await trx('blocks_meta').del()

    const messages = await trx('nano_community_messages')
      .select('message', 'message_digest', 'public_key')
      .where({ version: 2, operation: 'SET_BLOCK_META' })
      .orderBy([
        { column: 'created_at', order: 'asc' },
        { column: 'message_digest', order: 'asc' }
      ])

    for (const row of messages) {
      counts.messages += 1
      const payload = JSON.parse(row.message)
      const account = await resolve_account({
        connection: trx,
        public_key: row.public_key,
        payload
      })
      try {
        const applied = await process_set_block_meta({
          content: payload.parameters.content,
          references: payload.parameters.references,
          account,
          issued_at: payload.issued_at,
          message_digest: row.message_digest,
          get_block_account,
          connection: trx
        })
        counts[applied ? 'applied' : 'superseded'] += 1
      } catch (error) {
        // a node outage must abort the rebuild, not reject every note
        if (!(error instanceof CommunityRequestError) || error.status >= 500) {
          throw error
        }
        counts.rejected += 1
        log(`rejected ${row.message_digest}: ${error.message}`)
      }
    }

    for (const row of previous.filter((row) => row.hidden_at)) {
      const updated = await trx('blocks_meta')
        .where({ block_hash: row.block_hash })
        .update({ hidden_at: row.hidden_at, hidden_reason: row.hidden_reason })
      if (!updated) {
        counts.hides_dropped += 1
        log(`dropped the hide on ${row.block_hash}: no note row after rebuild`)
      }
    }

    const rebuilt = new Map(
      (await trx('blocks_meta').select()).map((row) => [row.block_hash, row])
    )
    const before = new Map(previous.map((row) => [row.block_hash, row]))
    for (const block_hash of new Set([...rebuilt.keys(), ...before.keys()])) {
      const a = before.get(block_hash)
      const b = rebuilt.get(block_hash)
      if (!a || !b || note_key(a) !== note_key(b)) {
        counts.changed += 1
        log(`changed ${block_hash}`)
      }
    }

    if (dry_run) {
      await trx.rollback()
    } else {
      await trx.commit()
    }
  } catch (error) {
    await trx.rollback()
    throw error
  }

  return counts
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const argv = yargs(hideBin(process.argv))
      .option('dry-run', {
        type: 'boolean',
        description: 'report what a rebuild would change, then roll back'
      })
      .parse()
    let exit_code = 0
    try {
      const counts = await rebuild_blocks_meta({ dry_run: argv['dry-run'] })
      log(
        `${argv['dry-run'] ? 'dry run' : 'rebuilt'}: ${JSON.stringify(counts)}`
      )
    } catch (error) {
      log(error)
      exit_code = 1
    }
    process.exit(exit_code)
  }

  main()
}
