const debug = require('debug')

const { request } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const main = async () => {
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

module.exprots = main

if (!module.parent) {
  const init = async () => {
    try {
      await main()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
