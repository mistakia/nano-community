const debug = require('debug')
const dayjs = require('dayjs')

const config = require('../config')
const { rpc, getNetworkInfo, wait } = require('../common')
const db = require('../db')

const logger = debug('script')
debug.enable('script')

const timestamp = Math.round(Date.now() / 1000)

const main = async () => {
  logger(`saving telemetry for interval: ${timestamp}`)
  // get telemetry from single node
  const telemetry = await rpc.telemetry()
  if (!telemetry || telemetry.error) {
    return
  }

  let maxCementedCount = 0
  let maxBlockCount = 0
  const telemetryByIp = {}
  for (const item of telemetry.metrics) {
    const blockCount = parseInt(item.block_count, 10)
    if (blockCount > maxBlockCount) maxBlockCount = blockCount

    const cementedCount = parseInt(item.cemented_count, 10)
    if (cementedCount > maxCementedCount) maxCementedCount = cementedCount
    telemetryByIp[`[${item.address}]:${item.port}`] = item
  }

  logger(`received telemetry for ${telemetry.metrics.length} nodes`)

  const results = {}

  // get confirmation_quorum from multiple nodes
  const requests = config.rpcAddresses.map((url) =>
    rpc.confirmationQuorum({ url })
  )
  const responses = await Promise.allSettled(requests)
  const weightInserts = []
  for (let i = 0; i < responses.length; i++) {
    const res = responses[i]
    if (res.value && !res.value.error) {
      weightInserts.push({
        address: config.rpcAddresses[i],
        quorum_delta: res.value.quorum_delta,
        online_weight_quorum_percent: res.value.online_weight_quorum_percent,
        online_weight_minimum: res.value.online_weight_minimum,
        online_stake_total: res.value.online_stake_total,
        trended_stake_total: res.value.trended_stake_total,
        peers_stake_total: res.value.peers_stake_total,
        timestamp
      })

      for (const peer of res.value.peers) {
        // do not overwrite main node so ephemeral ports match
        if (!results[peer.account]) results[peer.account] = peer
      }
    }
  }

  if (weightInserts.length) {
    logger(`saving voting weight info from ${weightInserts.length} reps`)
    await db('voting_weight').insert(weightInserts)
  }

  logger(`discovered ${Object.values(results).length} reps`)

  // merge data using ip address & port
  const repInserts = []
  for (const item of Object.values(results)) {
    const node = telemetryByIp[item.ip]
    if (!node) continue
    repInserts.push({
      // data from confirmation_quorum
      account: item.account,
      weight: item.weight,

      // data from telemetry
      block_count: node.block_count,
      block_behind: maxBlockCount - node.block_count,
      cemented_count: node.cemented_count,
      cemented_behind: maxCementedCount - node.cemented_count,
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
      telemetry_timestamp: dayjs(parseInt(node.timestamp, 10)).unix(),

      timestamp
    })
  }

  if (repInserts.length) {
    logger(`saving metrics for ${repInserts.length} reps`)
    await db('representatives_telemetry').insert(repInserts)
  }

  const nodeInserts = []
  for (const node of telemetry.metrics) {
    // check to see if node exists as a representative
    const rep = repInserts.find((r) => r.node_id === node.node_id)
    if (!rep) {
      nodeInserts.push({
        // data from telemetry
        block_count: node.block_count,
        block_behind: maxBlockCount - node.block_count,
        cemented_count: node.cemented_count,
        cemented_behind: maxCementedCount - node.cemented_count,
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
        telemetry_timestamp: dayjs(parseInt(node.timestamp, 10)).unix(),

        timestamp
      })
    }
  }

  if (nodeInserts.length) {
    logger(`saving metrics for ${nodeInserts.length} nodes`)
    await db('representatives_telemetry').insert(nodeInserts)
  }

  const now = dayjs()
  for (const item of repInserts) {
    // get last network stat
    const result = await db('representatives_network')
      .where({
        account: item.account,
        address: item.address
      })
      .limit(1)
      .orderBy('timestamp', 'desc')

    // ignore any ip / address combos fetched within the last three days
    if (
      result.length &&
      dayjs.unix(result[0].timestamp).add('3', 'day').isAfter(now)
    ) {
      continue
    }

    const network = await getNetworkInfo(item.address)
    if (network.status === 'success') {
      logger(
        `saving network info for account ${item.account} at ${item.address}`
      )
      await db('representatives_network').insert({
        account: item.account,
        address: item.address,

        continent: network.continent,
        country: network.country,
        countryCode: network.countryCode,
        region: network.region,
        regionName: network.regionName,
        city: network.city,
        zip: network.zip,
        lat: network.lat,
        lon: network.lon,
        timezone: network.timezone,
        isp: network.isp,
        org: network.org,
        as: network.as,
        asname: network.asname,
        hosted: network.hosting,

        timestamp
      })
    }

    await wait(2000)
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
