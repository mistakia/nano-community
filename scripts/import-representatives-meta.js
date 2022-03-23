const debug = require('debug')
const dayjs = require('dayjs')
const fetchCheerioObject = require('fetch-cheerio-object')

const { request } = require('../common')
const db = require('../db')

const logger = debug('import:representatives:meta')
debug.enable('import:representatives:meta')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const timestamp = Math.round(Date.now() / 1000)

const main = async () => {
  const reps = await db('accounts').where({ representative: true })

  for (const rep of reps) {
    const url = `https://mynano.ninja/api/accounts/${rep.account}`
    let res

    try {
      res = await request({ url })
    } catch (err) {
      console.log(err)
    }

    if (!res) {
      continue
    }

    const ninjaUrl = `https://mynano.ninja/account/${res.slug || res.account}`
    const sanitize = (str) =>
      str
        .replace(/(reddit|github|discord|twitter)/gi, '')
        .replace(/\r?\n|\r/g, '')
        .trim()
    const $ = await fetchCheerioObject(ninjaUrl)
    const reddit = sanitize($('.fa-reddit').parent().text())
    const twitter = sanitize($('.fa-twitter').parent().text())
    const github = sanitize($('.fa-github').parent().text())
    const discord = sanitize($('.fa-discord').parent().text())

    const result = await db('representatives_meta')
      .where({ account: res.account })
      .orderBy('timestamp', 'desc')
      .limit(1)

    const meta = {
      ...(result.length ? result[0] : {}),

      account: res.account,

      ninja_cpu_description: res.server ? res.server.cpu : null,
      ninja_ram_description: res.server ? res.server.ram : null,
      ninja_type: res.server ? res.server.type : null,
      ninja_provider: res.network ? res.network.provider : null,
      mynano_ninja: ninjaUrl,
      ninja_created_at: dayjs(res.created).unix(),
      ninja_description: res.description,

      reddit,
      github,
      twitter,
      discord
    }

    // check for changes
    if (result.length) {
      // remove timestamp
      const prevObj = Object.assign({}, { ...result[0], timestamp: undefined })
      const newObj = Object.assign({}, { ...meta, timestamp: undefined })
      if (JSON.stringify(prevObj) === JSON.stringify(newObj)) {
        logger(`skipping meta for account: ${meta.account}`)
        await wait(1500)
        continue
      }
    }

    logger(`saving meta for account: ${meta.account}`)
    await db('representatives_meta').insert({
      ...meta,
      timestamp
    })
    await wait(1500)
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
