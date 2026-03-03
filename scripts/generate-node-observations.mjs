import debug from 'debug'

import { isMain, saveData } from '#common'
import report_job from '../libs-server/report-job.mjs'
import db from '#db'

const log = debug('generate-node-observations')
debug.enable('generate-node-observations')

const generateNodeObservations = async () => {
  const start = process.hrtime.bigint()

  const rows = await db('representatives_telemetry')
    .select('address')
    .whereNull('account')
    .groupBy('address')

  const addresses = rows.map((r) => r.address)
  const nodes = []
  for (const address of addresses) {
    const rep_at_address = await db('representatives_telemetry')
      .whereNotNull('account')
      .where({ address })
      .limit(1)

    // ignore addresses with a rep
    if (rep_at_address.length) continue

    const re = await db('representatives_telemetry')
      .count('address as observations')
      .where({ address })
      .groupBy('address')

    nodes.push({
      address,
      observations: re[0].observations
    })
  }

  const timestamp = new Date().toISOString()
  await saveData('node-observations', { timestamp, nodes })
  const end = process.hrtime.bigint()
  log(
    `Generated observations for ${nodes.length} nodes in ${Number(
      (end - start) / BigInt(1e9)
    )} secs`
  )
}

if (isMain(import.meta.url)) {
  const main = async () => {
    const start_time = Date.now()
    let error
    try {
      await generateNodeObservations()
    } catch (err) {
      error = err
      console.log(err)
    }

    await report_job({
      job_id: 'nano-community-generate-node-observations',
      success: !error,
      reason: error ? error.message : null,
      duration_ms: Date.now() - start_time,
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

export default generateNodeObservations
