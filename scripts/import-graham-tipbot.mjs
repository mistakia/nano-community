import debug from 'debug'

import { request, isMain } from '#common'
import db from '#db'

const logger = debug('import-graham-tipbot')
debug.enable('import-graham-tipbot')

const importGrahamTipbot = async () => {
  const url = 'https://nanobotapi.banano.cc/users'
  const res = await request({ url })

  const inserts = res.map((i) => ({
    account: i.address,
    alias: `Graham TipBot Discord ${i.user_last_known_name}`
  }))

  if (inserts.length) {
    logger(`saving aliases for ${inserts.length} accounts`)
    for (let i = 0; i < inserts.length; i += 1000) {
      await db('accounts')
        .insert(inserts.slice(i, i + 1000))
        .onConflict()
        .merge()
    }
  }
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await importGrahamTipbot()
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

export default importGrahamTipbot
