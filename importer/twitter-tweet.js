const { request } = require('../common')
const config = require('../config')

const reTwitterTweet =
  /twitter.com\/[a-zA-Z0-9_]{4,25}\/status\/(?<tweetId>[0-9]{13})/

const main = async (link) => {
  const m = link.match(reTwitterTweet)
  const { tweetId } = m.groups
  const url = `https://api.twitter.com/1.1/statuses/show.json?id=${tweetId}`
  const headers = {
    Authorization: `Bearer ${config.twitterAuthorization}`
  }
  const res = await request({ url, headers })
  console.log(res)
}

module.exports = main
module.exports.re = reTwitterTweet

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
