import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, isMain } from '#common'
import db from '#db'

const logger = debug('import-accounts-meta')
debug.enable('import-accounts-meta')

const timestamp = Math.round(Date.now() / 1000)

const importAccountsMeta = async () => {
  const { representatives } = await rpc.representatives()
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
    .orderBy('accounts_meta_index.weight', 'desc')
  const accounts = rows.map((r) => r.account)

  const inserts = []
  const startTime = process.hrtime()
  for (const account of accounts) {
    const currentTime = process.hrtime(startTime)
    // Check if 5 minutes have passed (5 minutes = 300 seconds, hrtime returns time in seconds and nanoseconds)
    if (currentTime[0] > 300) {
      logger('5 minute runtime limit reached, stopping further processing')
      break
    }

    const accountInfo = await rpc.accountInfo({ account, timeout: 5000 })
    if (!accountInfo || accountInfo.error) {
      logger(`unable to get account info for ${account}`)

      if (representatives && representatives[account]) {
        inserts.push({
          account,
          timestamp,
          weight: representatives[account]
        })
      }
      continue
    }

    // TODO - get delegators
    inserts.push({
      account,
      balance: accountInfo.balance,
      block_count: accountInfo.block_count,
      weight: accountInfo.weight,
      timestamp
    })
  }

  if (inserts.length) {
    logger(`saving meta for ${inserts.length} accounts`)
    await db('accounts_meta').insert(inserts).onConflict().merge()
    await db('accounts_meta_index').insert(inserts).onConflict().merge()
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await importAccountsMeta()
    } catch (err) {
      console.log(err)
    }
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
