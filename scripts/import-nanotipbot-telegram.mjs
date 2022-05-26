import debug from 'debug'

import { request, isMain } from '#common'
import db from '#db'

const logger = debug('import-nanotipbot-telegram')
debug.enable('import-nanotipbot-telegram')

const importNanoTipBotTelegram = async () => {
  const url = 'https://nanotipbot.com/users/telegram'
  const res = await request({ url })

  const inserts = res.map((i) => ({
    account: i.account,
    alias: `NanoTipBot Telegram ${i.user_name}`
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
      await importNanoTipBotTelegram()
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

export default importNanoTipBotTelegram
