const debug = require('debug')

const { request } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const main = async () => {
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

module.exports = main

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
