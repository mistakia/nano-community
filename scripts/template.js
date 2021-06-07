const debug = require('debug')

/* eslint-disable no-unused-vars */
const { request } = require('../common')

const logger = debug('script')
debug.enable('script')
/* eslint-enable no-unused-vars */

const main = async () => {
  // main
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
