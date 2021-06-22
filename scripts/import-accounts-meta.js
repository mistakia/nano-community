const debug = require('debug')

const { rpc } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const timestamp = Math.round(Date.now() / 1000)

const main = async () => {
  const { representatives } = await rpc.representatives()
  const rows = await db('accounts')
    .select('account')
    .where({ representative: true })
  const accounts = rows.map((r) => r.account)

  const inserts = []
  for (const account of accounts) {
    const accountInfo = await rpc.accountInfo({ account })
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
  }
}

module.exprots = main

if (!module.parent) {
  const init = async () => {
    try {
      await main()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
