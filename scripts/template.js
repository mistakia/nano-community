const debug = require('debug')

const { request } = require('../common')

const logger = debug('script')
debug.enable('script')

const main = async () => {
  // main
}

module.exprots = main

if (!module.parent) {
  const init = async () => {
    await main()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
