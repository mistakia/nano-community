import debug from 'debug'

import { rpcAddresses } from '#config'
import { rpc, cloudflare, isMain, getData } from '#common'

const log = debug('update-cloudflare-dns-reps')
debug.enable('update-cloudflare-dns-reps')

const updateCloudflareDNS = async () => {
  const mappings = await getData('representative-mappings')
  if (!mappings) {
    log('representative mappings not found')
    return
  }

  // calculte half PR weight
  const confirmation_quorum = await rpc.confirmationQuorum({
    url: rpcAddresses[0]
  })
  const weight_threshold = Math.max(
    confirmation_quorum.online_stake_total,
    confirmation_quorum.trended_stake_total
  )
  const half_principal_rep_weight = BigInt(weight_threshold / 1000 / 2)

  // filter mappings by weight
  const filtered_mappings = mappings.filter(
    (m) => BigInt(m.weight) >= half_principal_rep_weight
  )

  // get current DNS records
  const records = await cloudflare.getRecords({
    name: 'representatives.nano.community'
  })

  const a_records = records.result.filter((r) => r.type === 'A')
  const aaaa_records = records.result.filter((r) => r.type === 'AAAA')

  // delete any A records not in filtered mapping
  for (const record of a_records) {
    const exists = filtered_mappings.find(
      (m) => m.address.replace('::ffff:', '') === record.content
    )
    if (!exists) {
      try {
        log(`Deleting record for ${record.content}`)
        await cloudflare.deleteRecord(record)
      } catch (err) {
        log(err)
      }
    }
  }

  // delete any AAAA records not in filtered mapping
  for (const record of aaaa_records) {
    const exists = filtered_mappings.find((m) => m.address === record.content)
    if (!exists) {
      try {
        log(`Deleting record for ${record.content}`)
        await cloudflare.deleteRecord(record)
      } catch (err) {
        log(err)
      }
    }
  }

  // create anny missing records
  for (const mapping of filtered_mappings) {
    const aaaa_exists = aaaa_records.find((r) => r.content === mapping.address)
    if (!aaaa_exists) {
      log(`Creating AAAA record for ${mapping.address}`)

      const options = {
        type: 'AAAA',
        name: 'representatives.nano.community',
        content: mapping.address,
        ttl: 60,
        proxied: false
      }

      try {
        await cloudflare.createRecord(options)
      } catch (err) {
        log(err)
        log(options)
      }
    }

    const isIPV4 = mapping.address.includes('::ffff:')
    if (!isIPV4) {
      continue
    }

    const ipv4_address = mapping.address.replace('::ffff:', '')
    const a_exists = a_records.find((r) => r.content === ipv4_address)
    if (!a_exists) {
      log(`Creating A record for ${ipv4_address}`)

      const options = {
        type: 'A',
        name: 'representatives.nano.community',
        content: ipv4_address,
        ttl: 60,
        proxied: false
      }

      try {
        await cloudflare.createRecord(options)
      } catch (err) {
        log(err)
        log(options)
      }
    }
  }

  log('Finished updating cloudflare dns records')
}

if (isMain(import.meta.url)) {
  const main = async () => {
    try {
      await updateCloudflareDNS()
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

export default updateCloudflareDNS
