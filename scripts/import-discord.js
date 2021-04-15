const moment = require('moment')
const debug = require('debug')

const db = require('../db')
const config = require('../config')
const { request, wait } = require('../common')

const logger = debug('script')
debug.enable('script')

const headers = {
  authorization: config.discordAuthorization
}

const getChannelsForGuildId = async (guildId) => {
  const channels = []
  const url = `https://discord.com/api/v8/guilds/${guildId}/channels`

  let res
  try {
    res = await request({ url, headers })
    res.forEach(({ name, id }) => channels.push({ name, id }))
  } catch (err) {
    console.log(err)
  }

  return channels
}

const main = async (guildId, { getFullHistory = false } = {}) => {
  logger(`importing discord server: ${guildId}`)

  const channels = await getChannelsForGuildId(guildId)
  logger(`found ${channels.length} channels`)

  for (const channel of channels) {
    logger(`importing channel: ${channel.name}`)

    const cid = `discord:${channel.id}:`
    const rows = await db('posts')
      .where('pid', 'like', `${cid}%`)
      .orderBy('created_at', 'desc')
      .limit(1)

    const messageId = rows.length ? rows[0].pid.split(cid)[1] : undefined
    let beforeId, messageIds, res
    do {
      const url =
        `https://discord.com/api/v8/channels/${channel.id}/messages?limit=100` +
        (beforeId ? `&before=${beforeId}` : '')

      logger(
        `fetching messages from ${channel.name}, before: ${beforeId || 'n/a'}`
      )

      try {
        res = await request({ url, headers })
      } catch (err) {
        // console.log(err)
      }

      if (!res) {
        break
      }

      const posts = res.map((p) => ({
        pid: `discord:${p.channel_id}:${p.id}`,
        title: null,
        url: `https://discord.com/channels/${guildId}/${p.channel_id}/${p.id}`,
        author: p.author.username,
        created_at: moment(p.timestamp).unix(),
        updated_at: p.edited_timestamp
          ? moment(p.edited_timestamp).unix()
          : null,
        html: null,
        text: p.content,
        score: p.reactions
          ? p.reactions.reduce((sum, item) => (sum = sum + item.count), 0)
          : 0
      }))

      if (posts.length) {
        logger(`saving ${posts.length} posts from ${channel.name}`)
        await db('posts').insert(posts).onConflict().merge()
      }

      messageIds = res.map((p) => p.id)
      beforeId = messageIds[messageIds.length - 1]
      if (!getFullHistory && messageIds.includes(messageId)) {
        break
      }

      await wait(2000)
    } while (res && res.length)
  }
}

module.exports = main

if (!module.parent) {
  const yargs = require('yargs/yargs')
  const { hideBin } = require('yargs/helpers')
  const argv = yargs(hideBin(process.argv)).argv

  if (!argv.gid) {
    logger('missing gid')
    process.exit()
  }

  const guildId = argv.gid
  const getFullHistory = argv.full
  const init = async () => {
    await main(guildId, { getFullHistory })
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
  }
}
