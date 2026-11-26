import fs from 'fs/promises'
import debug from 'debug'

import default_db from '#db'
import { seconds_to_date } from '#libs-server/epoch-seconds.mjs'

const log = debug('network-observer:principal-representatives')

// A representative enters the principal set at 0.1% of online weight and
// leaves below 0.09%, so one hovering between the two never flaps.
export const PRINCIPAL_ENTER_BASIS_POINTS = 10n
export const PRINCIPAL_LEAVE_BASIS_POINTS = 9n

// Online weight is the median online_stake_total over this window, as on the
// weight API.
const ONLINE_WEIGHT_WINDOW_SECONDS = 15 * 60

// accounts_meta_index keeps a row for every account it ever held, but
// scripts/import-accounts-meta.mjs refreshes only representatives seen in the
// last month, every 5 minutes. A row older than this is a stale weight.
const WEIGHT_MAXIMUM_AGE_SECONDS = 24 * 60 * 60

// Reads online weight and the weight of every representative at or above the
// leave threshold, as raw decimal strings: both are cast to text in SQL
// because db/index.mjs parses numeric as a float, which cannot hold 39 digits.
// An account missing from weights_by_account is below the leave threshold.
// behind_accounts are the representatives with an open
// representative_cemented_behind condition: a began row with no ended row for
// its condition id. Returns null when no voting_weight row is recent enough to
// judge.
export const load_principal_inputs = async ({
  db = default_db,
  now_seconds = Math.floor(Date.now() / 1000)
} = {}) => {
  const [online_row] = await db('voting_weight')
    .where(
      'observed_at',
      '>',
      seconds_to_date(now_seconds - ONLINE_WEIGHT_WINDOW_SECONDS)
    )
    .select(
      db.raw(
        'percentile_disc(0.5) within group (order by online_stake_total)::text as online_weight'
      )
    )
  if (!online_row?.online_weight) return null
  const { online_weight } = online_row

  const rows = await db('accounts_meta_index')
    .where(
      'observed_at',
      '>',
      seconds_to_date(now_seconds - WEIGHT_MAXIMUM_AGE_SECONDS)
    )
    .whereRaw('weight * 10000 >= ?::numeric * ?', [
      online_weight,
      String(PRINCIPAL_LEAVE_BASIS_POINTS)
    ])
    .select('account', db.raw('weight::text as weight'))

  const weights_by_account = {}
  for (const { account, weight } of rows) {
    weights_by_account[account.trim()] = weight
  }

  const behind_rows = await db('network_events')
    .where({
      network_event_type: 'representative_cemented_behind',
      network_event_phase: 'began'
    })
    .whereNotExists(
      db('network_events as ended_events')
        .where('ended_events.network_event_phase', 'ended')
        .whereRaw(
          'ended_events.network_event_condition_id = network_events.network_event_condition_id'
        )
    )
    .distinct('representative_account')
  const behind_accounts = behind_rows
    .map(({ representative_account }) => representative_account.trim())
    .sort()

  return {
    online_weight,
    weights_by_account,
    behind_accounts,
    loaded_at: now_seconds
  }
}

// Loads from the database and keeps a copy on disk, so a restart during a
// database outage still knows the principal set. Falls back to the copy when
// the load fails or finds nothing, and returns null when neither exists.
export const load_principal_inputs_with_cache = async ({
  db = default_db,
  cache_file,
  now_seconds
}) => {
  try {
    const principal_inputs = await load_principal_inputs({ db, now_seconds })
    if (principal_inputs) {
      await fs.writeFile(cache_file, JSON.stringify(principal_inputs))
      return principal_inputs
    }
    log('no recent voting_weight rows, using the cached principal inputs')
  } catch (error) {
    log(`principal inputs load failed, using the cached copy: ${error.message}`)
  }
  try {
    return JSON.parse(await fs.readFile(cache_file, 'utf8'))
  } catch {
    return null
  }
}
