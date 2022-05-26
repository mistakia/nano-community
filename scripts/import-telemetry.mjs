import debug from 'debug'
import dayjs from 'dayjs'

import * as config from '#config'
import { rpc, getNetworkInfo, wait, median, isMain } from '#common'
import db from '#db'
import mapped_reps from '#root/mapped-reps.mjs'

const logger = debug('import-telemetry')
debug.enable('import-telemetry')

const timestamp = Math.round(Date.now() / 1000)

const importTelemetry = async () => {
  logger(`saving telemetry for interval: ${timestamp}`)

  // get telemetry from single node
  const telemetry = await rpc.telemetry()
  if (!telemetry || telemetry.error) {
    return
  }

  logger(`received telemetry for ${telemetry.metrics.length} nodes`)

  // get confirmation_quorum from multiple nodes
  const rep_peers = {}
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
        if (!rep_peers[peer.account]) rep_peers[peer.account] = peer
      }
    }
  }

  const median_online_weight = median(
    weightInserts.map((w) => parseInt(w.online_stake_total, 10))
  )
  const median_trended_weight = median(
    weightInserts.map((w) => parseInt(w.trended_stake_total, 10))
  )
  const half_principal_rep_weight =
    Math.max(median_online_weight, median_trended_weight) / 1000 / 2

  if (weightInserts.length) {
    logger(`saving voting weight info from ${weightInserts.length} reps`)
    await db('voting_weight').insert(weightInserts)
  }

  logger(`discovered ${Object.values(rep_peers).length} reps`)

  const nodeInserts = []
  for (const node of telemetry.metrics) {
    const insert = {
      // data from telemetry
      block_count: node.block_count,
      cemented_count: node.cemented_count,
      unchecked_count: node.unchecked_count,
      account_count: node.account_count,
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
    }

    // associate telemetry with a mapped rep (or through rep crawler)
    const mapped_rep = mapped_reps[node.address]
    let telemetry_rep
    if (mapped_rep) {
      telemetry_rep = rep_peers[mapped_rep]
    }

    // if no mapped rep — associate using rep crawler if there are no conflicts
    if (!telemetry_rep) {
      // map telemetry to rep by matching address to rep crawler (quorum confirmation)
      const quorum_mapped_rep = Object.values(rep_peers).find(
        (p) => p.ip === `[${node.address}]:${node.port}`
      )
      if (quorum_mapped_rep) {
        // get any associated mapped addresses for matched rep
        const mapped_addresses = Object.entries(mapped_reps)
          .filter((i) => i[1] === quorum_mapped_rep)
          .map((i) => i[0])
        // make sure no telemetry exists for those mapped addresses
        const mapped_telemetry_found = telemetry.metrics.find((i) =>
          mapped_addresses.includes(i.address)
        )
        if (!mapped_telemetry_found) {
          telemetry_rep = quorum_mapped_rep
        }
      }
    }

    if (telemetry_rep) {
      insert.account = telemetry_rep.account
      insert.weight = telemetry_rep.weight
    }

    nodeInserts.push(insert)
  }

  // get max counts
  let maxCementedCount = 0
  let maxBlockCount = 0
  for (const item of nodeInserts) {
    if (!item.weight || item.weight < half_principal_rep_weight) continue
    const blockCount = parseInt(item.block_count, 10)
    if (blockCount > maxBlockCount) maxBlockCount = blockCount

    const cementedCount = parseInt(item.cemented_count, 10)
    if (cementedCount > maxCementedCount) maxCementedCount = cementedCount
  }

  // set blocks behind
  for (const item of nodeInserts) {
    item.block_behind = maxBlockCount - item.block_count
    item.cemented_behind = maxCementedCount - item.cemented_count
  }

  if (nodeInserts.length) {
    logger(`saving metrics for ${nodeInserts.length} nodes`)
    logger(
      `saving metrics for ${
        nodeInserts.filter((n) => n.account).length
      } nodes w/ reps`
    )
    await db('representatives_telemetry').insert(nodeInserts)
  }

  const now = dayjs()
  const repInserts = nodeInserts.filter((n) => n.account)
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

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await importTelemetry()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }

  try {
    main()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}

export default importTelemetry
