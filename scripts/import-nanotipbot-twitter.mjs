import debug from 'debug'

import { request, isMain } from '#common'
import db from '#db'

const logger = debug('import-nanotipbot-twitter')
debug.enable('import-nanotipbot-twitter')

const importNanoTipBotTwitter = async () => {
  const url = 'https://nanotipbot.com/users/twitter'
  const res = await request({ url })

  const inserts = res.map((i) => ({
    account: i.account,
    alias: `NanoTipBot Twitter @${i.user_name}`
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
      await importNanoTipBotTwitter()
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

export default importNanoTipBotTwitter
