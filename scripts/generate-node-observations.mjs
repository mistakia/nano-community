import debug from 'debug'

import { isMain, saveData } from '#common'
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
    try {
      await generateNodeObservations()
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

export default generateNodeObservations
