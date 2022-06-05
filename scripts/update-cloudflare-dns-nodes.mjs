import debug from 'debug'

import { cloudflare, isMain } from '#common'

const log = debug('update-cloudflare-dns')
debug.enable('update-cloudflare-dns')

const updateCloudflareDNS = async () => {
  const url = 'https://nano.community/data/node-observations.json'
  const nodes = await request({ url })

  const max_observations = Math.max(...nodes.map((n) => n.observations))
  const observations_threshold = Math.round(max_observations * 0.5)

  // filter mappings by weight
  const filtered_nodes = nodes.filter(
    (m) => m.observations > observations_threshold
  )

  // get current DNS records
  const records = await cloudflare.getRecords({
    name: 'nodes.nano.community'
  })

  const a_records = records.result.filter((r) => r.type === 'A')
  const aaaa_records = records.result.filter((r) => r.type === 'AAAA')

  // delete any A records not in filtered mapping
  for (const record of a_records) {
    const exists = filtered_nodes.find(
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
    const exists = filtered_nodes.find((m) => m.address === record.content)
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
  for (const mapping of filtered_nodes) {
    const aaaa_exists = aaaa_records.find((r) => r.content === mapping.address)
    if (!aaaa_exists) {
      log(`Creating AAAA record for ${mapping.address}`)

      const options = {
        type: 'AAAA',
        name: 'nodes.nano.community',
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
        name: 'nodes.nano.community',
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
