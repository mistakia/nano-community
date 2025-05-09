import debug from 'debug'
import dayjs from 'dayjs'

import config from '#config'
import { rpc, getNetworkInfo, wait, median, isMain, getData } from '#common'
import db from '#db'

const log = debug('import-telemetry')
debug.enable('import-telemetry')

const timestamp = Math.round(Date.now() / 1000)

const importTelemetry = async () => {
  const mappings = await getData('representative-mappings')
  if (!mappings) {
    log('representative mappings not found')
    return
  }

  log(`saving telemetry for interval: ${timestamp}`)

  // get telemetry from single node
  const telemetry = await rpc.telemetry()
  if (!telemetry || telemetry.error) {
    return
  }

  log(`received telemetry for ${telemetry.metrics.length} nodes`)

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
        // do not overwrite main node so that if an ephemeral port is
        // used it can be matched with telemtry from the main node
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
    log(`saving voting weight info from ${weightInserts.length} reps`)
    await db('voting_weight').insert(weightInserts)
  }

  log(`discovered ${Object.values(rep_peers).length} reps`)

  // Group telemetry metrics by node_id to handle multiple interfaces
  const node_id_groups = {}
  for (const node of telemetry.metrics) {
    if (!node_id_groups[node.node_id]) {
      node_id_groups[node.node_id] = []
    }
    node_id_groups[node.node_id].push(node)
  }

  log(
    `Found ${Object.keys(node_id_groups).length} unique node_ids from ${telemetry.metrics.length} telemetry entries`
  )

  const nodeInserts = []
  // Create a map to track accounts that have been seen
  const seen_accounts = new Map()

  // Debug mapping distribution
  const mapping_stats = {
    total_nodes: telemetry.metrics.length,
    nodes_with_account: 0,
    mapping_sources: {
      existing_mapped_rep: 0,
      repcrawler_mapped_rep: 0,
      unknown: 0
    },
    duplicate_accounts: {}
  }

  // Process only one telemetry entry per node_id
  for (const node_id in node_id_groups) {
    // Use the first node entry for this node_id
    const node = node_id_groups[node_id][0]

    // Log if this node_id has multiple interfaces
    if (node_id_groups[node_id].length > 1) {
      log(
        `Multiple interfaces for node_id ${node_id}: ${node_id_groups[node_id].map((n) => `${n.address}:${n.port}`).join(', ')}`
      )
    }

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
      major_version: parseInt(node.major_version, 10),
      minor_version: parseInt(node.minor_version, 10),
      patch_version: node.patch_version,
      pre_release_version: node.pre_release_version,
      maker: node.maker,
      node_id: node.node_id,
      address: node.address,
      port: node.port,
      telemetry_timestamp: dayjs(parseInt(node.timestamp, 10)).unix(),

      timestamp
    }

    let existing_mapped_rep
    let telemetry_rep
    let repcrawler_mapped_rep = null

    // match node_id if using v23.1 or newer (otherwise use address)
    if (
      insert.major_version > 23 ||
      (insert.major_version === 23 && insert.minor_version >= 1)
    ) {
      existing_mapped_rep = mappings.find((m) => m.node_id === node.node_id)
    } else {
      existing_mapped_rep = mappings.find((m) => m.address === node.address)
    }

    // associate telemetry using rep mapping
    if (existing_mapped_rep) {
      telemetry_rep = rep_peers[existing_mapped_rep.account]
    }

    // if no mapped rep — associate using rep crawler if there are no conflicts
    if (!telemetry_rep) {
      // Try all interfaces for this node_id when matching with rep crawler
      for (const node_interface of node_id_groups[node_id]) {
        // map telemetry to rep by matching address to rep crawler (quorum confirmation)
        repcrawler_mapped_rep = Object.values(rep_peers).find(
          (p) => p.ip === `[${node_interface.address}]:${node_interface.port}`
        )
        if (repcrawler_mapped_rep) {
          // get any associated mapped addresses for matched rep
          const mapped_addresses = mappings
            .filter((m) => m.account === repcrawler_mapped_rep)
            .map((m) => m.address)

          if (mapped_addresses.length) {
            log(
              `DEBUG: Found ${mapped_addresses.length} mapped addresses for account ${repcrawler_mapped_rep.account}`
            )
          }

          // make sure no telemetry exists for those mapped addresses
          const telemetry_exists_for_mapped_addresses = telemetry.metrics.find(
            (i) => mapped_addresses.includes(i.address)
          )
          if (!telemetry_exists_for_mapped_addresses) {
            telemetry_rep = repcrawler_mapped_rep
            break // Use the first successful match
          } else {
            log(
              `DEBUG: Rejected match for node ${node.node_id} due to telemetry existing for mapped addresses`
            )
          }
        }
      }
    }

    if (telemetry_rep) {
      insert.account = telemetry_rep.account
      insert.weight = telemetry_rep.weight
      mapping_stats.nodes_with_account++

      const mapping_source = existing_mapped_rep
        ? 'existing_mapped_rep'
        : repcrawler_mapped_rep
          ? 'repcrawler_mapped_rep'
          : 'unknown'
      mapping_stats.mapping_sources[mapping_source]++

      // Debug: Check if this account has been seen before
      if (insert.account) {
        if (seen_accounts.has(insert.account)) {
          const previous = seen_accounts.get(insert.account)
          log(`DUPLICATE ACCOUNT DETECTED: ${insert.account}`)
          log(
            `PREVIOUS NODE: ${previous.node_id} at ${previous.address}:${previous.port}`
          )
          log(
            `CURRENT NODE: ${insert.node_id} at ${insert.address}:${insert.port}`
          )

          // Log the mapping sources to identify how these nodes got mapped to the same account
          log(
            `PREVIOUS MAPPING SOURCE: ${previous.mapping_source || 'unknown'}`
          )
          log(`CURRENT MAPPING SOURCE: ${mapping_source}`)

          // Track duplicates for summary
          if (!mapping_stats.duplicate_accounts[insert.account]) {
            mapping_stats.duplicate_accounts[insert.account] = 1
          }
          mapping_stats.duplicate_accounts[insert.account]++
        } else {
          // Store the insert object with mapping source info
          const debug_insert = { ...insert }
          debug_insert.mapping_source = mapping_source
          seen_accounts.set(insert.account, debug_insert)
        }
      }
    }

    nodeInserts.push(insert)
  }

  // Output statistics to help identify patterns in duplicate mappings
  log('--------- MAPPING STATISTICS ----------')
  log(`Total nodes: ${mapping_stats.total_nodes}`)
  log(`Nodes with account: ${mapping_stats.nodes_with_account}`)
  log(`Mapping sources: ${JSON.stringify(mapping_stats.mapping_sources)}`)
  log(
    `Accounts with duplicates: ${Object.keys(mapping_stats.duplicate_accounts).length}`
  )
  if (Object.keys(mapping_stats.duplicate_accounts).length > 0) {
    log(
      `Duplicate accounts: ${JSON.stringify(mapping_stats.duplicate_accounts)}`
    )
  }
  log('--------------------------------------')

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
    log(`saving metrics for ${nodeInserts.length} nodes`)
    log(
      `saving metrics for ${
        nodeInserts.filter((n) => n.account).length
      } nodes w/ reps`
    )

    await db('representatives_telemetry').insert(nodeInserts)
    await db('representatives_telemetry_index')
      .insert(nodeInserts)
      .onConflict('account')
      .merge()
  }

  const now = dayjs()
  const repInserts = nodeInserts.filter((n) => n.account)

  // Track which accounts we've already processed to avoid duplicates
  const processed_accounts = new Set()

  for (const item of repInserts) {
    // Skip if we've already processed this account
    if (processed_accounts.has(item.account)) {
      continue
    }
    processed_accounts.add(item.account)

    // TODO transition to index table
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
      log(`saving network info for account ${item.account} at ${item.address}`)
      const rep_network_insert = {
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
      }

      await db('representatives_network').insert(rep_network_insert)
      await db('representatives_network_index')
        .insert(rep_network_insert)
        .onConflict('account')
        .merge()
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
