import debug from 'debug'
import fetch from 'node-fetch'

import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'
import db from '#db'

const logger = debug('import-graham-tipbot')
debug.enable('import-graham-tipbot')

const importGrahamTipbot = async () => {
  const url = 'https://nanobotapi.banano.cc/users'
  const response = await fetch(url, { timeout: 20000 })

  // Upstream added auth in 2026-06: GET /users now returns plain-text
  // `401: Invalid or missing API key.` and the host root 404s, so there is no
  // self-serve key registration. Treat any non-OK response as a clean no-op so
  // the daily job stops paging instead of throwing on the unparseable error
  // body. To restore the alias import, register a banano API key and pass it
  // via an Authorization header here.
  // See user:task/nano-community/retire-dead-tipbot-importers.md.
  if (!response.ok) {
    logger(
      `skipping import: ${url} returned HTTP ${response.status}; upstream requires an API key (none provisioned)`
    )
    return
  }

  const res = await response.json()

  const inserts = res.map((i) => ({
    account: i.address,
    alias: `Graham TipBot Discord ${i.user_last_known_name}`
  }))

  if (inserts.length) {
    logger(`saving aliases for ${inserts.length} accounts`)
    for (let i = 0; i < inserts.length; i += 1000) {
      await db('accounts')
        .insert(inserts.slice(i, i + 1000))
        .onConflict('account')
        .merge()
    }
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await importGrahamTipbot()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-import-graham-tipbot',
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

export default importGrahamTipbot
