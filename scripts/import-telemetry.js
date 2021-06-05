const debug = require('debug')
const moment = require('moment')

const config = require('../config')
const { rpc } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const timestamp = Math.round(Date.now() / 1000)

const main = async () => {
  // get telemetry from single node
  const telemetry = await rpc.telemetry()
  if (!telemetry || telemetry.error) {
    return
  }

  const telemetryByIp = {}
  for (const item of telemetry.metrics) {
    telemetryByIp[`[${item.address}]:${item.port}`] = item
  }

  logger(`received telemetry for ${telemetry.metrics.length} nodes`)

  // get confirmation_quorum from multiple nodes
  const requests = config.rpcAddresses.map((url) =>
    rpc.confirmationQuorum({ url })
  )
  const responses = await Promise.allSettled(requests)
  const results = {}
  for (const res of responses) {
    if (res.value && !res.value.error) {
      for (const peer of res.value.peers) {
        results[peer.account] = peer
      }
    }
  }

  logger(`discovered ${Object.values(results).length} reps`)

  // merge data using ip address & port
  const inserts = []
  for (const item of Object.values(results)) {
    const node = telemetryByIp[item.ip]
    if (!node) continue
    inserts.push({
      // data from confirmation_quorum
      account: item.account,
      weight: item.weight,

      // data from telemetry
      block_count: node.block_count,
      cemented_count: node.cemented_count,
      unchecked_count: node.unchecked_count,
      bandwidth_cap: node.bandwidth_cap,
      peer_count: node.peer_count,
      protocol_version: node.protocol_version,
      uptime: node.uptime,
      major_version: node.major_version,
      minor_version: node.minor_version,
      patch_version: node.patch_version,
      pre_release_version: node.pre_release_version,
      maker: node.maker,
      node_id: node.node_id,
      address: node.address,
      port: node.port,
      telemetry_timestamp: moment(node.timestamp, 'x').unix(),

      timestamp
    })
  }

  if (inserts.length) {
    logger(`saving metrics for ${inserts.length} reps`)
    await db('representatives_telemetry').insert(inserts)
  }
}

module.exprots = main

if (!module.parent) {
  const init = async () => {
    await main()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}
