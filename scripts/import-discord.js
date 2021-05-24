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

const excludeChannels = [
  '403628195548495885', // nt - i hear voices
  '403628195548495886', // nt - hangouts hd
  '403642500973330462', // nt - offtopic
  '403642625527119872', // nt - the circus
  '406318878298210314', // nt - hangouts sd
  '456813985367326720', // nt - worldcup
  '474959416895078402', // nt - giveaways
  '476409915888631809', // nt - treasure hunt
  '486569081785286666', // nt - price check
  '604731087369011230', // nt - whale alerts
  '677401078886563840', // nt - hangouts text
  '725781775716188181', // nt - politics
  '729829214794154004', // nt - nangry
  '759284898182856725', // nt - music
  '792291386237255721', // nt - charts
  '818725624050614302', // nt - hangouts lofi
  '415933844038877194', // nt - wallets
  '419885145210880010', // nt - puzzle solvers

  // private
  '523887477757575188', // nano - mod-history
  '548157077437022208', // nano - user history
  '523886767372500994', // nano - mod team
  '499224422180323334', // nano - archived
  '453645703978156042', // nano - new member
  '408020942250573834', // nano - 3rdparty-devs
  '405559981417693185', // nano - brainblocks
  '400790999166877706', // nano - lykke_tech
  '403850374005653504', // nano - pos_dev
  '399952530634833920', // nano - community-management-team
  '397990432732348416', // nano - rightbtc_tech
  '397791456321863680', // nano - debug_tech
  '397769966834941974', // nano - bitflip_tech
  '396852875810045952', // nano - cobinhood_tech
  '395910068895350789', // nano - coinfalcon
  '395828156864659473', // nano - bitz_tech
  '395410363295989760', // nano - trade_organization
  '393133169211080724', // nano - raiexchange_tech
  '392201266085888000', // nano - mercatox_tech
  '392068024552652810', // nano - next_xrb
  '372523530274865152', // nano - internal_development
  '370981975256858625', // nano - Nano Foundation Team
  '370285432979587103', // nano - exchange_team

  '805899143570259970', // nano - translations
  '784454182371459163', // nano - private-test-net
  '680144761549750377', // nano - research-development
  '766723792964812801', // nano - test-net
  '742684686786232392', // nano - moderator-only
  '727519943419232306', // nano - beta-faucet
  '725342483705495702', // nano - Nano Dev AMA
  '690644341479178333', // nano - Nano-Quake
  '725330577632526358', // nano - dev-ama
  '676437802690412575', // nano - wikipedia
  '628987342694252575', // nano - pow
  '573064313061769226', // nano - events
  '537549258245668864', // nano - off-topic
  '467429088190267393', // nano - github commits
  '465168864200753162', // nano - scam report
  '414305380869341204', // nano - nwc-wallet
  '407952439640326146', // nano - bitgrail-chat-temporary
  '395271536678010882', // nano - bug bounty
  '370266023905198086', // nano - voice channels
  '370336821466628096', // nano - charla general
  '370336888206131202', // nano - tagalog
  '581832306915016735', // nano - ledger
  '695323919095300138', // nano - gaming
  '370336920166858753', // nano - russian
  '370337132071616512', // nano - indonesian
  '370339679742066688', // nano - trading
  '370451429745360896', // nano - italian
  '370979830948298763', // nano - spanish
  '370982153237823489', // nano - tagalog 2
  '370982157507756032', // nano - anuncios
  '370982203712208897', // nano - russian 2
  '370982260360478721', // nano - indonesian 2
  '370982541752139786', // nano - italian 2
  '386783830666641418', // nano - german
  '386783877815074818', // nano - german
  '387648663306108928', // nano - chinese
  '387648945116938243', // nano - chinese
  '387650651204616194', // nano - french
  '387650699724455949', // nano - french
  '388079208112455690', // nano - dutch
  '388079764260519958', // nano - dutch
  '388839442980274176', // nano - Portuguese
  '388839547372437505', // nano - portuguese
  '391837779723550720', // nano - iazo_tech
  '394244364987006978', // nano - turkish
  '394244571179253770', // nano - turkish
  '394257359490383893', // nano - faq_es
  '395284766812930049', // nano - faq_ru
  '396051315979190284', // nano - polish
  '396051360904249344', // nano - polish
  '397762034089066507', // nano - swedish
  '397909844251639808', // nano - flowhub
  '399645337779830784', // nano - korean
  '399645410970304513', // nano - korean
  '399674643138478083', // nano - korean
  '400859958612197376', // nano - japenese
  '400859985761796096', // nano - japenese
  '401148013625606166', // nano - israel
  '401148177899847691', // nano - israel
  '401149655313809408', // nano - israel
  '401303506994069505', // nano - croatian
  '401303570273796098', // nano - croatian
  '402595560789508096', // nano - arabic
  '402595593362341889', // nano - arabic
  '402595617047576607', // nano - arabic
  '404125241011601408', // nano - vietnamese
  '404125269528412173', // nano - vietnamese
  '404125344212189184', // nano - vietnamese
  '438987154333368320', // nano - Голосовой Чат
  '438988377283624960', // nano - norwegian
  '438988637733126144', // nano - danish
  '677179212041551889', // nano - hindi
  '677179284540096560', // nano - hindi
  '712972541584736286', // nano - Scandinavia
  '712972729258606612', // nano - scandinavian
  '712972805209325588', // nano - scandinavian
  '786709469936746576', // nano - greek
  '786709603261087754' // nano - greek
]

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

  let channels = await getChannelsForGuildId(guildId)
  channels = channels.filter((c) => !excludeChannels.includes(c.id))
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
        sid: `discord:${guildId}`,
        title: null,
        url: `https://discord.com/channels/${guildId}/${p.channel_id}/${p.id}`,
        author: p.author.username,
        authorid: p.author.id,
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
    process.exit()
  }
}
