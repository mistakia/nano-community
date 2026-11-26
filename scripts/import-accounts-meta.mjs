import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'
import {
  epoch_seconds_sql,
  seconds_to_date
} from '#libs-server/epoch-seconds.mjs'
import db from '#db'

const logger = debug('import-accounts-meta')

const timestamp = Math.round(Date.now() / 1000)

// accounts_delegators is refreshed hourly by import-accounts-rep.mjs. A newest
// row older than this means that import has stalled, so its counts are not
// recorded rather than written as current.
const DELEGATORS_SNAPSHOT_MAX_AGE_SECONDS = 3 * 60 * 60

// Delegating accounts holding at least 1 Nano per representative, 0 for a
// representative with none, or null when the accounts_delegators snapshot is
// stale.
export const get_delegator_counts = async ({ accounts, now = timestamp }) => {
  const { newest_observed_at } = await db('accounts_delegators')
    .select(db.raw(epoch_seconds_sql('max(observed_at)', 'newest_observed_at')))
    .first()
  if (
    !newest_observed_at ||
    now - newest_observed_at > DELEGATORS_SNAPSHOT_MAX_AGE_SECONDS
  ) {
    logger(
      `accounts_delegators snapshot is stale (newest ${newest_observed_at}), not recording delegator counts`
    )
    return null
  }

  const rows = await db('accounts_delegators')
    .select('representative')
    .count('* as delegators')
    .whereIn('representative', accounts)
    .groupBy('representative')
  const counts = new Map(accounts.map((account) => [account, 0]))
  for (const row of rows) {
    counts.set(row.representative, Number(row.delegators))
  }
  return counts
}

const importAccountsMeta = async () => {
  const rows = await db('accounts')
    .join(
      'accounts_meta_index',
      'accounts.account',
      '=',
      'accounts_meta_index.account'
    )
    .select('accounts.account')
    .where('accounts.representative', true)
    .andWhere('accounts.last_seen', '>', dayjs().subtract(1, 'month').unix())
    .orderByRaw('accounts_meta_index.weight desc nulls last')
  const accounts = rows.map((r) => r.account)
  const delegator_counts = await get_delegator_counts({ accounts })
  const get_delegators = (account) =>
    delegator_counts ? delegator_counts.get(account) : null

  const inserts = []
  const startTime = process.hrtime()
  for (const account of accounts) {
    const currentTime = process.hrtime(startTime)
    // Check if 5 minutes have passed (5 minutes = 300 seconds, hrtime returns time in seconds and nanoseconds)
    if (currentTime[0] > 300) {
      logger('5 minute runtime limit reached, stopping further processing')
      break
    }

    const accountInfo = await rpc.accountInfo({
      account,
      timeout: 5000,
      weight: true
    })
    if (!accountInfo || accountInfo.error) {
      logger(`unable to get account info for ${account}`)

      const account_weight_response = await rpc.accountWeight({
        account
      })

      if (!account_weight_response || account_weight_response.error) {
        logger(`unable to get account weight for ${account}`)
        continue
      }

      inserts.push({
        account,
        weight: account_weight_response.weight,
        delegators: get_delegators(account),
        observed_at: seconds_to_date(timestamp)
      })

      continue
    }

    inserts.push({
      account,
      balance: accountInfo.balance,
      block_count: accountInfo.block_count,
      weight: accountInfo.weight,
      delegators: get_delegators(account),
      observed_at: seconds_to_date(timestamp)
    })
  }

  if (inserts.length) {
    logger(`saving meta for ${inserts.length} accounts`)
    await db('accounts_meta')
      .insert(inserts)
      .onConflict(['account', 'observed_at'])
      .merge()
    await db('accounts_meta_index')
      .insert(inserts)
      .onConflict('account')
      .merge()
  }
}

if (isMain(import.meta.url)) {
  debug.enable('import-accounts-meta')
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await importAccountsMeta()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-import-accounts-meta',
      success: !error,
      reason: error ? error.message : null,
      duration_ms: Date.now() - start_time
    })

    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default importAccountsMeta
