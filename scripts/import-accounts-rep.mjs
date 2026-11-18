import debug from 'debug'
import dayjs from 'dayjs'

import { rpc, isMain, wait } from '#common'
import report_job from '#libs-server/report-job.mjs'
import { BURN_ACCOUNT } from '#constants'
import db from '#db'

const logger = debug('import-accounts-rep')

const timestamp = Math.round(Date.now() / 1000)

// `ledger` is served only by the trusted full node (rpc.ledger uses
// trustedAddresses) -- there is no proxy fallback. That node's disk is
// contended, so under load a 5000-account page can be slow to answer or slow
// to send its multi-MB body, well past the 20s RPC default. Give each page a
// long per-phase timeout (node-fetch applies it to the headers and again to
// the body), retry a failed page with a bounded backoff so a refused
// connection still throws within ~100s, and cap the whole run in main so a
// degraded node can never stack overlapping hourly runs.
const LEDGER_REQUEST_TIMEOUT_MS = 90000
const LEDGER_RETRY_BACKOFF_MS = [10000, 30000, 60000]
const LEDGER_IMPORT_TIMEOUT_MS = 40 * 60 * 1000

export const fetch_ledger_page = async ({
  ledger_request_params,
  request_ledger_page = rpc.ledger,
  wait_before_retry = wait
}) => {
  let response
  for (let attempt = 0; attempt <= LEDGER_RETRY_BACKOFF_MS.length; attempt++) {
    const attempt_started_at = Date.now()
    response = await request_ledger_page({
      ...ledger_request_params,
      timeout: LEDGER_REQUEST_TIMEOUT_MS
    })
    if (response && !response.error) {
      return response
    }

    if (attempt < LEDGER_RETRY_BACKOFF_MS.length) {
      const delay = LEDGER_RETRY_BACKOFF_MS[attempt]
      logger(
        `ledger page at ${ledger_request_params.account} failed after ${
          Date.now() - attempt_started_at
        }ms (${response ? response.error : 'Empty RPC Response'}); retry ${
          attempt + 1
        }/${LEDGER_RETRY_BACKOFF_MS.length} in ${delay}ms`
      )
      await wait_before_retry(delay)
    }
  }

  throw new Error(response ? response.error : 'Empty RPC Response')
}

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

    const rpcResponse = await fetch_ledger_page({
      ledger_request_params: {
        ...opts,
        account,
        representative: true
      }
    })

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

    await db('accounts_delegators')
      .insert(inserts)
      .onConflict('account')
      .merge()

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
  debug.enable('import-accounts-rep')
  const main = async () => {
    const start_time = Date.now()
    let error
    let import_timer
    try {
      await Promise.race([
        importAccountsRep(),
        new Promise((resolve, reject) => {
          import_timer = setTimeout(
            () =>
              reject(
                new Error(
                  `ledger import passed its ${
                    LEDGER_IMPORT_TIMEOUT_MS / 60000
                  } minute timeout`
                )
              ),
            LEDGER_IMPORT_TIMEOUT_MS
          )
        })
      ])
    } catch (err) {
      error = err
      console.log(err)
    } finally {
      clearTimeout(import_timer)
    }

    await report_job({
      job_id: 'nano-community-import-accounts-rep',
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

export default importAccountsRep
