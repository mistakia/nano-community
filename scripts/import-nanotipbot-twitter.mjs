import debug from 'debug'

import { isMain } from '#common'
import report_job from '#libs-server/report-job.mjs'

const logger = debug('import-nanotipbot-twitter')
debug.enable('import-nanotipbot-twitter')

const importNanoTipBotTwitter = async () => {
  logger(
    'nanotipbot.com upstream is dead (domain parked); import is a no-op. Remove the cron entry on the VPS to retire this job.'
  )
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const start_time = Date.now()
    await importNanoTipBotTwitter()
    await report_job({
      job_id: 'nano-community-import-nanotipbot-twitter',
      success: true,
      reason: null,
      duration_ms: Date.now() - start_time
    })
    process.exit()
  }
  main()
}

export default importNanoTipBotTwitter
