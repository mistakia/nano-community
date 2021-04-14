const { request } = require('../common')

const reForumPost = /forum.nano.org\/t\/[A-z-]+\/(?<topicId>[0-9]+)$/

const main = async (link) => {
  const m = link.match(reForumPost)
  const { topicId } = m.groups
  const url = `https://forum.nano.org/t/${topicId}.json`
  const res = await request({ url })
  console.log(res)
}

module.exports = main
module.exports.re = reForumPost

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
