const { request } = require('../common')
const config = require('../config')

const reDiscordComment = /discord.com\/channels\/(?<guildId>370266023905198083|403628195548495882)\/(?<channelId>[0-9]{18})\/(?<messageId>[0-9]{18})/

const main = async (link) => {
  const m = link.match(reDiscordComment)
  const { channelId, messageId } = m.groups
  // TODO - get messages and use around query
  const url = `https://discord.com/api/v8/channels/${channelId}/messages/${messageId}`
  const headers = {
    authorization: config.discordAuthorization
  }
  const res = await request({ url, headers })
  console.log(res)
}

module.exports = main
module.exports.re = reDiscordComment

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
