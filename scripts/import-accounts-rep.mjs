import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, isMain } from '#common'
import { BURN_ACCOUNT } from '#constants'
import db from '#db'

const logger = debug('import-accounts-rep')
debug.enable('import-accounts-rep')

const timestamp = Math.round(Date.now() / 1000)

const importAccountsRep = async ({
  hours,
  threshold = '1000000000000000000000000000000'
} = {}) => {
  // get accounts modified since, above 1 Nano

  const batchSize = 5000
  let index = 0
  let addressCount = 0
  let returnedAddresses = []
  let account = BURN_ACCOUNT

  const opts = {
    count: batchSize,
    threshold
  }

  if (hours) {
    opts.modified_since = dayjs().subtract(hours, 'hours').unix()
  }

  logger(opts)

  do {
    logger(
      `Fetching accounts from ${index} to ${index + batchSize} (${account})`
    )

    const rpcResponse = await rpc.ledger({
      ...opts,
      account,
      representative: true
    })

    if (!rpcResponse || rpcResponse.error) {
      throw new Error(rpcResponse ? rpcResponse.error : 'Empty RPC Response')
    }

    const { accounts } = rpcResponse
    const addresses = Object.keys(accounts)
    addressCount = addresses.length
    returnedAddresses = [...addresses, ...returnedAddresses]
    logger(`${addressCount} accounts returned`)

    const inserts = []
    for (const address in accounts) {
      const { representative, balance } = accounts[address]
      inserts.push({
        account: address,
        representative,
        balance,
        timestamp
      })
    }

    await db('accounts_delegators').insert(inserts).onConflict().merge()

    index += batchSize
    account = addresses[addressCount - 1]
  } while (addressCount === batchSize)

  // delete if its not filtered by modified_timestamp
  // addresses not returned are below the threshold
  if (!hours) {
    for (let i = 0; i < returnedAddresses.length; i = i + batchSize) {
      const addresses = returnedAddresses.slice(i, i + batchSize)
      await db('accounts_delegators')
        .whereNot({ timestamp })
        .whereNotIn('account', addresses)
        .del()
    }
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await importAccountsRep()
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

export default importAccountsRep
