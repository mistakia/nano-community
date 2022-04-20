const debug = require('debug')
const net = require('net')
const dayjs = require('dayjs')
const BigNumber = require('bignumber.js')

const logger = debug('script')
debug.enable('script')

const db = require('../db')

const ipRe = /::ffff:([0-9.]+)/

const checkPort = async (port, { timeout = 1000, host } = {}) => {
  const promise = new Promise((resolve, reject) => {
    const socket = new net.Socket()

    const onError = (err) => {
      socket.destroy()
      reject(err)
    }

    socket.setTimeout(timeout)
    socket.once('error', onError)
    socket.once('timeout', onError)

    socket.connect(port, host, () => {
      socket.end()
      resolve()
    })
  })

  try {
    await promise
    return true
  } catch (_) {
    return false
  }
}

const main = async () => {
  // get reps seen in the last month
  const representatives = await db('accounts')
    .where({ representative: true })
    .where('last_seen', '>', dayjs().subtract('1', 'month').unix())

  const accounts = representatives.map((r) => r.account)

  const telemetryQuery = db('representatives_telemetry')
    .select(db.raw('max(timestamp) AS maxtime, account AS aid'))
    .groupBy('account')
  const telemetry = await db
    .select('representatives_telemetry.*')
    .from(db.raw('(' + telemetryQuery.toString() + ') AS X'))
    .innerJoin('representatives_telemetry', function () {
      this.on(function () {
        this.on('account', '=', 'aid')
        this.andOn('timestamp', '=', 'maxtime')
      })
    })
    .whereIn('account', accounts)

  const open = []
  for (const { address, account, node_id, weight } of telemetry) {
    const match = ipRe.exec(address)
    const ip = match ? match[1] : address
    const isOpen = await checkPort(7076, { host: ip })
    if (isOpen) {
      logger(`port 7076 is open for ${ip}`)
      open.push({ address, account, node_id, weight })
    } else {
      logger(`port 7076 is closed for ${ip}`)
    }
  }
  logger(open)
  let totalWeight = 0
  for (const node of open) {
    totalWeight = BigNumber(node.weight).plus(totalWeight).toFixed()
  }
  logger(`Total weight: ${totalWeight}`)
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
