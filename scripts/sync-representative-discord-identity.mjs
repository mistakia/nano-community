import debug from 'debug'

import db from '#db'
import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'
import update_representative_meta from '#libs-server/update-representative-meta.mjs'

const log = debug('sync-representative-discord-identity')

// Discord retired discriminators in 2023, so `name#1234` and `name` are the
// same handle; case never distinguishes two current handles.
export const normalize_discord_handle = (value) =>
  (value || '').split('#')[0].trim().toLowerCase()

const load_discord_author_names = async () => {
  const rows = await db('posts')
    .select('authorid', 'author')
    .max('created_at as last_seen_at')
    .where('sid', 'like', 'discord:%')
    .whereNotNull('authorid')
    .groupBy('authorid', 'author')

  const discord_user_ids_by_handle = new Map()
  const author_names_by_discord_user_id = new Map()
  for (const row of rows) {
    const handle = normalize_discord_handle(row.author)
    if (!discord_user_ids_by_handle.has(handle)) {
      discord_user_ids_by_handle.set(handle, new Set())
    }
    discord_user_ids_by_handle.get(handle).add(row.authorid)

    if (!author_names_by_discord_user_id.has(row.authorid)) {
      author_names_by_discord_user_id.set(row.authorid, [])
    }
    author_names_by_discord_user_id.get(row.authorid).push(row)
  }

  for (const names of author_names_by_discord_user_id.values()) {
    names.sort((a, b) => b.last_seen_at - a.last_seen_at)
  }

  return { discord_user_ids_by_handle, author_names_by_discord_user_id }
}

// Resolve each representative's Discord user id from the authors of imported
// Discord posts, then keep the representative's username at the newest name
// that id has posted under. A representative whose stored handle is not one
// of that id's names made a claim the posts cannot confirm, so it is left as
// reported.
export const sync_representative_discord_identity = async () => {
  const { discord_user_ids_by_handle, author_names_by_discord_user_id } =
    await load_discord_author_names()

  const representatives = await db('representatives_meta_index')
    .select('account', 'discord', 'discord_user_id')
    .where((builder) =>
      builder
        .where((inner) =>
          inner.whereNotNull('discord').andWhere('discord', '<>', '')
        )
        .orWhereNotNull('discord_user_id')
    )

  const counts = {
    resolved_count: 0,
    renamed_count: 0,
    unmatched_count: 0,
    claim_mismatch_count: 0
  }

  for (const representative of representatives) {
    const { account, discord } = representative
    const handle = normalize_discord_handle(discord)
    let { discord_user_id } = representative

    if (!discord_user_id) {
      const matching_discord_user_ids = discord_user_ids_by_handle.get(handle)
      if (!matching_discord_user_ids || matching_discord_user_ids.size !== 1) {
        counts.unmatched_count += 1
        continue
      }

      discord_user_id = [...matching_discord_user_ids][0]
      await update_representative_meta({
        representative_account_address: account,
        update: { discord_user_id }
      })
      counts.resolved_count += 1
      log(
        `resolved discord_user_id ${discord_user_id} for ${account} from ${discord}`
      )
    }

    const author_names = author_names_by_discord_user_id.get(discord_user_id)
    if (!author_names) {
      continue
    }

    // An id reported without a username takes the id's newest name
    const is_known_name =
      !handle ||
      author_names.some(
        (name) => normalize_discord_handle(name.author) === handle
      )
    if (!is_known_name) {
      counts.claim_mismatch_count += 1
      log(
        `kept ${discord} for ${account}: not a name discord_user_id ${discord_user_id} has posted under`
      )
      continue
    }

    const newest_name = author_names[0].author
    if (newest_name !== discord) {
      await update_representative_meta({
        representative_account_address: account,
        update: { discord: newest_name }
      })
      counts.renamed_count += 1
      log(`renamed discord for ${account}: ${discord} => ${newest_name}`)
    }
  }

  log(
    `representatives: ${representatives.length}, resolved: ${counts.resolved_count}, renamed: ${counts.renamed_count}, unmatched: ${counts.unmatched_count}, claim mismatch: ${counts.claim_mismatch_count}`
  )

  return counts
}

if (isMain(import.meta.url)) {
  debug.enable(
    'sync-representative-discord-identity,update-representative-meta'
  )
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await sync_representative_discord_identity()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-sync-representative-discord-identity',
      success: !error,
      reason: error ? error.message : null,
      duration_ms: Date.now() - start_time
    })

    process.exit()
  }

  main()
}
