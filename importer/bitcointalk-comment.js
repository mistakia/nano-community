// const { request } = require('../common')

const reBitcointalkComment = /bitcointalk.org\/index.php\?topic=[0-9]+.[0-9]+/

const main = async (link) => {
  // const m = link.match(reBitcointalkComment)
}

module.exports = main
module.exports.re = reBitcointalkComment

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  const init = async () => {
    await main(argv.url)
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
