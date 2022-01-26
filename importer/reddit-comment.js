const { request } = require('../common')

const reRedditComment =
  /reddit.com\/r\/nanocurrency\/comments\/(?<postId>[a-z0-9]{6})\/[A-Za-z0-9\-_]+\/(?<commentId>[a-z0-9]+)/

const main = async (link) => {
  const m = link.match(reRedditComment)
  const { postId, commentId } = m.groups
  const url = `https://www.reddit.com/r/nanocurrency/comments/${postId}/${commentId}.json`
  const res = await request({ url })
  console.log(res)
}

module.exports = main
module.exports.re = reRedditComment

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
