import debug from 'debug'

import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'
import { sync_account_label_sources } from '#libs-server/account-labels/index.mjs'

const log = debug('sync-account-labels')
debug.enable('sync-account-labels,sync-account-label-sources')

if (isMain(import.meta.url)) {
  const main = async () => {
    const start_time = Date.now()
    let reason = null
    try {
      const results = await sync_account_label_sources()
      log(results)
      const failed = results.filter((result) => !result.ok)
      if (failed.length) {
        reason = failed
          .map((result) => `${result.source}: ${result.error}`)
          .join('; ')
      }
    } catch (error) {
      console.log(error)
      reason = error.message
    }

    await report_job({
      job_id: 'nano-community-sync-account-labels',
      success: !reason,
      reason,
      duration_ms: Date.now() - start_time
    })

    process.exit()
  }

  main()
}
