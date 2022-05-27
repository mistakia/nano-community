import debug from 'debug'

import { rpcAddresses } from '#config'
import { rpc, cloudflare, isMain, getData } from '#common'

const log = debug('update-cloudflare-dns')
debug.enable('update-cloudflare-dns')

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

  // delete any records not in filtered mapping
  for (const record of records.result) {
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
    const exists = records.result.find((r) => r.content === mapping.address)
    if (exists) {
      continue
    }

    log(`Creating record for ${mapping.address}`)

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
