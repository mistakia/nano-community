const debug = require('debug')
const BigNumber = require('bignumber.js')

const { request } = require('../common')
const db = require('../db')

const logger = debug('import:representatives')
debug.enable('import:representatives')

const main = async () => {
  const requests = [
    request({ url: 'https://mynano.ninja/api/accounts/aliases' }),
    request({ url: 'https://mynano.ninja/api/accounts/monitors' }),
    request({ url: 'https://mynano.ninja/api/accounts/principals' })
  ]

  const responses = await Promise.allSettled(requests)
  const fulfilled = responses.filter((r) => r.status === 'fulfilled')
  if (!fulfilled.length) {
    throw new Error('requests failed')
  }

  // aliases
  if (responses[0].status === 'fulfilled') {
    const res = responses[0].value
    const items = res.map((p) => ({
      account: p.account,
      alias: p.alias
    }))

    if (items.length) {
      logger(`saving ${items.length} aliases from mynano.ninja`)
      await db('accounts').insert(items).onConflict().merge()
    }
  }

  // monitors
  if (responses[1].status === 'fulfilled') {
    const res = responses[1].value
    const items = res.map((p) => ({
      account: p.account,
      monitor_url: p.monitor.url
    }))

    if (items.length) {
      logger(`saving ${items.length} monitors from mynano.ninja`)
      await db('accounts').insert(items).onConflict().merge()
    }
  }

  // principals
  if (responses[2].status === 'fulfilled') {
    const res = responses[2].value
    const items = res.map((p) => ({
      account: p.account,
      alias: p.alias,
      representative: true
    }))

    if (items.length) {
      logger(`saving ${items.length} representatives from mynano.ninja`)
      await db('accounts').insert(items).onConflict().merge()
    }
  }
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
